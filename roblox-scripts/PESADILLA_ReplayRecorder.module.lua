-- ModuleScript: ServerScriptService/PESADILLA_ReplayRecorder
-- Server-authoritative position samples (2 Hz) for 3D replay in Cloudflare D1.
-- Wire Start() and Finish() from the actual PvP match controller, not from LocalScripts.
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local Recorder = {}

local ENDPOINT = "https://pesadilla-pvp-dashboard.fh4xdzzzz.workers.dev/api/ingest/replay"
local SAMPLE_INTERVAL = 0.5
local MAX_DURATION = 900 -- 15 min
local MAX_PLAYERS = 20
local FRAMES_PER_CHUNK = 40
local MAX_CHUNKS = 50
local sessions = {}
local uploading = {}
local function round(n)
    return math.floor(n * 10 + (n >= 0 and 0.5 or -0.5)) / 10
end
local function uid(value)
    if typeof(value) == "Instance" and value:IsA("Player") then
        return value.UserId
    end
    if typeof(value) == "number" then return value end
    return nil
end
local function sample(session)
    local elapsed = math.floor((os.clock() - session.started) * 10 + 0.5) / 10
    if elapsed > MAX_DURATION then return end
    local points = {}
    for _,userId in ipairs(session.ids) do
        local p = Players:GetPlayerByUserId(userId)
        local character = p and p.Character
        local root = character and character:FindFirstChild("HumanoidRootPart")
        if root and root:IsA("BasePart") then
            local pos,look = root.Position,root.CFrame.LookVector
            local yaw = math.deg(math.atan2(look.X,-look.Z))
            table.insert(points,{tostring(userId),round(pos.X),round(pos.Y),round(pos.Z),round(yaw)})
        end
    end
    table.insert(session.frames,{elapsed,points})
end
function Recorder.Start(matchId,participants)
    assert(typeof(matchId)=="string" and matchId:match("^[%w:_%-]+$"),"Replay: invalid matchId")
    assert(typeof(participants)=="table","Replay: participants must be a table")
    if sessions[matchId] or uploading[matchId] then return false end
    local ids,seen = {},{}
    for _,value in ipairs(participants) do
        local id = uid(value)
        if id and id > 0 and not seen[id] then
            table.insert(ids,id);seen[id]=true
        end
        if #ids >= MAX_PLAYERS then break end
    end
    if #ids == 0 then return false end
    local session = {ids=ids,frames={},started=os.clock(),accum=0}
    sessions[matchId] = session
    sample(session)
    session.connection = RunService.Heartbeat:Connect(function(dt)
        session.accum += dt
        if session.accum >= SAMPLE_INTERVAL then
            session.accum -= SAMPLE_INTERVAL
            if os.clock()-session.started <= MAX_DURATION then
                sample(session)
            elseif session.connection then
                session.connection:Disconnect()
                session.connection = nil
                warn("[PESADILLA Replay] Limite de 15 minutos; reanuda la partida sin mas grabacion")
            end
        end
    end)
    print("[PESADILLA Replay] Grabando partida",matchId,#ids,"jugadores")
    return true
end
local function send(data)
    local payload = HttpService:JSONEncode(data)
    local ok,result = pcall(function()
        return HttpService:RequestAsync({
            Url=ENDPOINT,Method="POST",
            Headers={
                ["Content-Type"]="application/json",
                ["Authorization"]=HttpService:GetSecret("PVP_DASHBOARD_INGEST"):AddPrefix("Bearer ")
            },
            Body=payload
        })
    end)
    if not ok then return false,"http_exception" end
    if not result.Success then return false,tostring(result.StatusCode) end
    return true,nil
end
function Recorder.Finish(matchId)
    local session = sessions[matchId]
    if not session then return false end
    sessions[matchId] = nil
    if session.connection then session.connection:Disconnect() end
    sample(session)
    local frames = session.frames
    if #frames==0 then return false end
    uploading[matchId]=true
    task.spawn(function()
        local total=math.ceil(#frames/FRAMES_PER_CHUNK)
        if total>MAX_CHUNKS then
            warn("[PESADILLA Replay] Limite de chunks excedido:",total)
            uploading[matchId]=nil
            return
        end
        local duration=frames[#frames][1]
        for index=0,total-1 do
            local chunk={}
            for i=index*FRAMES_PER_CHUNK+1,math.min((index+1)*FRAMES_PER_CHUNK,#frames) do
                table.insert(chunk,frames[i])
            end
            local body={
                matchId=matchId,index=index,totalChunks=total,frames=chunk,
                duration=duration,final=index==total-1
            }
            local success,err
            for attempt=1,3 do
                success,err=send(body)
                if success then break end
                task.wait(attempt*1.5)
            end
            if not success then
                warn("[PESADILLA Replay] Falló chunk",index,"partida",matchId,"HTTP",err)
                uploading[matchId]=nil
                return
            end
        end
        uploading[matchId]=nil
        print("[PESADILLA Replay] Replay guardado:",matchId,#frames,"fotogramas")
    end)
    return true
end
function Recorder.IsRecording(matchId)
    return sessions[matchId] ~= nil
end
return Recorder

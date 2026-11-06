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
local EVENT_LIMIT = 2000
local EVENT_BATCH = 40
local ALLOWED_EVENTS = {fire=true,hit=true,kill=true,jump=true,equip=true,round=true,ability=true,respawn=true,death=true}
local sessions = {}
local uploading = {}
local function round(n)
    return math.round(n * 10) / 10
end
local function uid(value)
    if typeof(value) == "Instance" and value:IsA("Player") then
        return value.UserId
    end
    if typeof(value) == "number" then return value end
    if typeof(value) == "table" then
        return tonumber(value.userId or value.UserId)
    end
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
    local session = {ids=ids,frames={},events={},connections={},started=os.clock(),accum=0}
    sessions[matchId] = session
    sample(session)
    -- Automatic server-authored markers; shooting/hits/skills must be connected from
    -- the authoritative weapon and match scripts through Recorder.RecordEvent.
    for _,userId in ipairs(ids) do
        local participant = Players:GetPlayerByUserId(userId)
        if participant then
            local function attach(character)
                local humanoid = character:FindFirstChildWhichIsA("Humanoid")
                if not humanoid then humanoid = character:WaitForChild("Humanoid", 5) end
                if not humanoid then return end
                table.insert(session.connections,humanoid.Died:Connect(function()
                    Recorder.RecordEvent(matchId,"death",userId,nil,nil,"")
                end))
                table.insert(session.connections,humanoid.StateChanged:Connect(function(_,state)
                    if state == Enum.HumanoidStateType.Jumping then
                        Recorder.RecordEvent(matchId,"jump",userId,nil,nil,"")
                    end
                end))
            end
            if participant.Character then task.spawn(attach,participant.Character) end
            table.insert(session.connections,participant.CharacterAdded:Connect(function(character)
                Recorder.RecordEvent(matchId,"respawn",userId,nil,nil,"")
                task.spawn(attach,character)
            end))
        end
    end
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
-- Call this only from trustworthy server logic, never from an unvalidated client RemoteEvent.
-- Example: ReplayRecorder.RecordEvent(matchId,"fire",attackerPlayer,nil,muzzlePosition,"Rifle")
function Recorder.RecordEvent(matchId,kind,actor,target,position,detail)
    local session = sessions[matchId]
    if not session or #session.events >= EVENT_LIMIT or not ALLOWED_EVENTS[kind] then return false end
    local actorId = uid(actor)
    local targetId = target == nil and nil or uid(target)
    if not actorId or not table.find(session.ids,actorId) then return false end
    if targetId and not table.find(session.ids,targetId) then return false end
    local p=position
    if typeof(p) ~= "Vector3" then
        local plr = Players:GetPlayerByUserId(actorId)
        local root=plr and plr.Character and plr.Character:FindFirstChild("HumanoidRootPart")
        p=root and root.Position or Vector3.zero
    end
    local elapsed=math.clamp(round(os.clock()-session.started),0,MAX_DURATION)
    table.insert(session.events,{
        elapsed,kind,tostring(actorId),targetId and tostring(targetId) or "",
        round(p.X),round(p.Y),round(p.Z),
        tostring(detail or ""):sub(1,80)
    })
    return true
end

local function send(data,suffix)
    local payload = HttpService:JSONEncode(data)
    local ok,result = pcall(function()
        return HttpService:RequestAsync({
            Url=ENDPOINT .. (suffix or ""),Method="POST",
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
    for _,connection in ipairs(session.connections) do connection:Disconnect() end
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
        local events = session.events
        if #events > 0 then
            local eventChunks = math.ceil(#events/EVENT_BATCH)
            for index=0,eventChunks-1 do
                local chunk={}
                for j=index*EVENT_BATCH+1,math.min((index+1)*EVENT_BATCH,#events) do
                    table.insert(chunk,events[j])
                end
                local success,err
                for attempt=1,3 do
                    success,err=send({matchId=matchId,index=index,totalChunks=eventChunks,events=chunk},"/events")
                    if success then break end
                    task.wait(attempt*1.5)
                end
                if not success then
                    warn("[PESADILLA Replay] Eventos parcialmente guardados:",matchId,index,err)
                    break
                end
            end
        end
        uploading[matchId]=nil
        print("[PESADILLA Replay] Replay guardado:",matchId,#frames,"fotogramas",#events,"eventos")
    end)
    return true
end
function Recorder.IsRecording(matchId)
    return sessions[matchId] ~= nil
end
return Recorder

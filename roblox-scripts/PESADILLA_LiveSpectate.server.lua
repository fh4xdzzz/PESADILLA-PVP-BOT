-- ServerScriptService/PESADILLA_LiveSpectate.server.lua
-- LIVE spectating across Roblox public servers: teleport admin to real match instance.
-- Server sends lightweight match presence; admin alone may list / join / watch.
-- Works in published experiences; target servers require a free player slot.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local Http = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")
local RunService = game:GetService("RunService")

local ENDPOINT = "https://pesadilla-pvp-dashboard.fh4xdzzzz.workers.dev/api/ingest/live"
local OWNER = 8223424925
local HEARTBEAT_SECONDS = 12
local function authorized(player)
    if player.UserId == OWNER then return true end
    -- Never authorize merely from a client-supplied role attribute.
    local module = script.Parent:FindFirstChild("PESADILLA_AdminRoles")
    if module and module:IsA("ModuleScript") then
        local ok, roles = pcall(require,module)
        if ok and type(roles) == "table" and type(roles.Can) == "function" then
            local allowed,result=pcall(roles.Can,player,"replay")
            if allowed and result == true then return true end
        end
    end
    return false
end
local function remote(name,class)
    local obj=RS:FindFirstChild(name)
    if obj and obj.ClassName~=class then error(name.." has wrong class") end
    if not obj then obj=Instance.new(class);obj.Name=name;obj.Parent=RS end
    return obj
end
local rpc=remote("PESADILLA_LiveSpectateRPC","RemoteFunction")
local signal=remote("PESADILLA_LiveSpectateSignal","RemoteEvent")
local function call(kind,method,body,query)
    local url=ENDPOINT.."/"..kind..(query or "")
    local ok,result=pcall(function()
        local settings={Url=url,Method=method,Headers={Authorization=Http:GetSecret("PVP_DASHBOARD_INGEST"):AddPrefix("Bearer ")}}
        if body then settings.Headers["Content-Type"]="application/json";settings.Body=Http:JSONEncode(body) end
        return Http:RequestAsync(settings)
    end)
    if not ok then warn("[LiveSpectate] HTTP exception",kind,tostring(result));return nil,"http_error" end
    if not result.Success then warn("[LiveSpectate] HTTP",kind,result.StatusCode);return nil,"http_"..tostring(result.StatusCode) end
    local parsed,response=pcall(function()return Http:JSONDecode(result.Body) end)
    if not parsed or typeof(response)~="table" then return nil,"bad_response" end
    return response,nil
end
local function participants()
    local grouped={}
    for _,p in ipairs(Players:GetPlayers()) do
        -- PVPMatchId originates from the authoritative match controller, not the client.
        local id=p:GetAttribute("PVPMatchId")
        local phase=p:GetAttribute("PVPMatchState")
        if typeof(id)=="string" and id:match("^[%w:_%-]+$") and #id<=100 and
            phase~="RETURNING" and phase~="LOBBY" and phase~="ENDED" then
            grouped[id]=grouped[id] or {}
            table.insert(grouped[id],{userId=p.UserId,username=p.Name})
        end
    end
    local games={}
    for id,roster in pairs(grouped) do
        if #roster>=2 and #games<20 then table.insert(games,{matchId=id,players=roster}) end
    end
    return games
end
task.spawn(function()
    while true do
        if not RunService:IsStudio() and game.JobId~="" and game.PrivateServerId=="" then
            local result,err=call("heartbeat","POST",{serverJobId=game.JobId,placeId=game.PlaceId,matches=participants()})
            if not result then warn("[LiveSpectate] Presence update failed:",err) end
        end
        task.wait(HEARTBEAT_SECONDS)
    end
end)

local lastRequest={}
local desired={}
local function validId(x)
    return typeof(x)=="string" and #x<=100 and x:match("^[%w:_%-]+$")~=nil
end
local function parseUserId(x)
    local id=tonumber(x)
    if id and id>0 and id==math.floor(id) then return id end
    return nil
end
local function watchHere(admin,matchId,targetId)
    local target=Players:GetPlayerByUserId(targetId)
    if not target or target:GetAttribute("PVPMatchId")~=matchId then return {ok=false,error="player_not_in_match"} end
    desired[admin]={matchId=matchId,userId=targetId}
    local root=target.Character and target.Character:FindFirstChild("HumanoidRootPart")
    if root then admin.ReplicationFocus=root end
    signal:FireClient(admin,"watch",targetId,matchId)
    return {ok=true,localServer=true}
end
local function joinMatch(admin,matchId,targetId)
    local result,err=call("target","GET",nil,"?matchId="..Http:UrlEncode(matchId).."&userId="..targetId)
    if not result then return {ok=false,error=err} end
    if not result.ok then return {ok=false,error=result.error or "not_found"} end
    if result.placeId~=game.PlaceId then return {ok=false,error="another_place_not_supported"} end
    if result.serverJobId==game.JobId then return watchHere(admin,matchId,targetId) end
    if RunService:IsStudio() then return {ok=false,error="test_in_published_server"} end
    if game.PrivateServerId~="" then return {ok=false,error="source_private_server"} end
    local opts=Instance.new("TeleportOptions")
    opts.ServerInstanceId=result.serverJobId
    opts:SetTeleportData({liveSpectate={matchId=matchId,userId=targetId}})
    -- TeleportAsync can fail if destination closes or is full. Don't affect combat state.
    task.spawn(function()
        local ok,exception=pcall(function()TeleportService:TeleportAsync(game.PlaceId,{admin},opts)end)
        if not ok and admin.Parent==Players then
            warn("[LiveSpectate] Teleport failed:",tostring(exception))
            signal:FireClient(admin,"error","No se pudo entrar al servidor. Puede estar lleno o cerrado.")
        end
    end)
    return {ok=true,teleporting=true}
end
rpc.OnServerInvoke=function(admin,action,value,extra)
    if not authorized(admin) then return {ok=false,error="permission_denied"} end
    if typeof(action)~="string" then return {ok=false,error="invalid_action"} end
    local now=os.clock()
    if now-(lastRequest[admin] or -100)<0.6 then return {ok=false,error="too_many_requests"} end
    lastRequest[admin]=now
    if action=="list" then
        local q=typeof(value)=="string" and value:sub(1,60) or ""
        local result,err=call("matches","GET",nil,"?q="..Http:UrlEncode(q))
        return result or {ok=false,error=err}
    elseif action=="history" then
        local id=parseUserId(value)
        if not id then return {ok=false,error="invalid_user"} end
        local page=math.clamp(tonumber(extra) or 1,1,1000)
        local result,err=call("history","GET",nil,"?userId="..id.."&page="..math.floor(page))
        return result or {ok=false,error=err}
    elseif action=="watch" then
        if not validId(value) then return {ok=false,error="invalid_match"} end
        local id=parseUserId(extra)
        if not id then return {ok=false,error="invalid_target"} end
        return joinMatch(admin,value,id)
    elseif action=="stop" then
        desired[admin]=nil
        admin.ReplicationFocus=nil
        signal:FireClient(admin,"stop")
        return {ok=true}
    end
    return {ok=false,error="invalid_action"}
end

local function handleArrivingAdmin(admin)
    if not authorized(admin) then return end
    local join=admin:GetJoinData()
    local data=join and join.TeleportData
    local request=typeof(data)=="table" and data.liveSpectate
    if typeof(request)~="table" or not validId(request.matchId) then return end
    local targetId=parseUserId(request.userId)
    if not targetId then return end
    task.delay(2,function()
        if admin.Parent~=Players then return end
        local result=watchHere(admin,request.matchId,targetId)
        if not result.ok then signal:FireClient(admin,"error","La partida terminó o el jugador salió.") end
    end)
end
Players.PlayerAdded:Connect(handleArrivingAdmin)
for _,p in ipairs(Players:GetPlayers()) do task.spawn(handleArrivingAdmin,p) end
Players.PlayerRemoving:Connect(function(p)lastRequest[p]=nil;desired[p]=nil end)
print("[PESADILLA LiveSpectate] servidor listo; espectadores autorizados solamente")

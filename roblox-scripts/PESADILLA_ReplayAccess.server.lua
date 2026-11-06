-- ServerScriptService/PESADILLA_ReplayAccess.server.lua
-- Private bridge: admin client -> authenticated Roblox server -> Cloudflare D1.
-- IMPORTANT: Fill in your own approved Roblox admin UserIds.
local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")

local ADMIN_USER_IDS = {
    -- [123456789] = true, -- REPLACE with your actual moderator UserIds.
}
-- Studio access is for local developer testing only, never public production.
local ALLOW_STUDIO_TEST = true
local WORKER = "https://pesadilla-pvp-dashboard.fh4xdzzzz.workers.dev/api/ingest/replay"
local remote = ReplicatedStorage:FindFirstChild("PESADILLA_ReplayRequest")
if not remote then
    remote = Instance.new("RemoteFunction")
    remote.Name = "PESADILLA_ReplayRequest"
    remote.Parent = ReplicatedStorage
end

local lastCalls = {}
local activeMatch = {}
local function authorized(player)
    return (ALLOW_STUDIO_TEST and RunService:IsStudio()) or ADMIN_USER_IDS[player.UserId] == true
end

local function getFromDashboard(kind, matchId, index)
    local uri = WORKER .. "/" .. kind .. "?matchId=" .. HttpService:UrlEncode(matchId)
    if kind == "chunk" then
        uri ..= "&index=" .. tostring(index)
    end
    local ok, result = pcall(function()
        return HttpService:RequestAsync({
            Url = uri,
            Method = "GET",
            Headers = {
                ["Authorization"] = HttpService:GetSecret("PVP_DASHBOARD_INGEST"):AddPrefix("Bearer "),
            }
        })
    end)
    if not ok then return {ok = false, error = "http_request_failed"} end
    if not result.Success then
        return {ok = false, error = "dashboard_" .. tostring(result.StatusCode)}
    end
    local parsedOk, response = pcall(function() return HttpService:JSONDecode(result.Body) end)
    if not parsedOk or typeof(response) ~= "table" then return {ok = false, error = "invalid_response"} end
    if response.matchId ~= matchId then return {ok = false, error = "wrong_match_id"} end
    return {ok = true, data = response}
end

remote.OnServerInvoke = function(player, action, matchId, chunkIndex)
    if not authorized(player) then return {ok = false, error = "permission_denied"} end
    if typeof(action) ~= "string" or (action ~= "meta" and action ~= "chunk") then
        return {ok = false, error = "invalid_action"}
    end
    if typeof(matchId) ~= "string" or #matchId > 100 or not matchId:match("^[%w:_%-]+$") then
        return {ok = false, error = "invalid_match_id"}
    end
    if action == "chunk" and (typeof(chunkIndex) ~= "number" or chunkIndex ~= math.floor(chunkIndex) or chunkIndex < 0 or chunkIndex > 49) then
        return {ok = false, error = "invalid_chunk"}
    end

    local now = os.clock()
    local interval = action == "meta" and 1 or 0.15
    if now - (lastCalls[player] or -100) < interval then
        return {ok = false, error = "too_many_requests"}
    end
    lastCalls[player] = now
    if action == "meta" then
        local result = getFromDashboard("meta", matchId)
        if result.ok then activeMatch[player] = matchId end
        return result
    end
    if activeMatch[player] ~= matchId then return {ok = false, error = "open_meta_first"} end
    local result = getFromDashboard("chunk", matchId, chunkIndex)
    if result.ok and #result.data.frames > 40 then return {ok = false, error = "invalid_chunk_frames"} end
    return result
end

Players.PlayerRemoving:Connect(function(p)
    lastCalls[p] = nil
    activeMatch[p] = nil
end)
print("[PESADILLA Replay V2] Bridge listo; configura ADMIN_USER_IDS antes de publicar")

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

local lastCalls = {} -- Metadata cooldown and rolling download limits per authorized admin.
local requestCounts = {}
local REQUEST_WINDOW = 30
local MAX_REQUESTS_PER_WINDOW = 120
local MAX_CONCURRENT_REQUESTS = 4
local activeMatch = {}
local function authorized(player)
    return (ALLOW_STUDIO_TEST and RunService:IsStudio()) or ADMIN_USER_IDS[player.UserId] == true
end

local function getFromDashboard(kind, matchId, index)
    local uri = WORKER .. "/" .. kind .. "?matchId=" .. HttpService:UrlEncode(matchId)
    if kind == "chunk" or kind == "events" then
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
    if not ok then
        warn("[ReplayAccess] Error HTTPS " .. tostring(kind) .. ": " .. tostring(result))
        return {ok = false, error = "http_request_failed"}
    end
    if not result.Success then
        local reason = "dashboard_" .. tostring(result.StatusCode)
        local decodedOk, body = pcall(function() return HttpService:JSONDecode(result.Body) end)
        if decodedOk and typeof(body) == "table" and typeof(body.error) == "string" then
            reason = reason .. "_" .. body.error
        end
        warn("[ReplayAccess] " .. tostring(kind) .. " fallo: " .. reason)
        return {ok = false, error = reason}
    end
    local parsedOk, response = pcall(function() return HttpService:JSONDecode(result.Body) end)
    if not parsedOk or typeof(response) ~= "table" then return {ok = false, error = "invalid_response"} end
    if response.matchId ~= matchId then return {ok = false, error = "wrong_match_id"} end
    return {ok = true, data = response}
end

remote.OnServerInvoke = function(player, action, matchId, chunkIndex)
    if not authorized(player) then return {ok = false, error = "permission_denied"} end
    if typeof(action) ~= "string" or (action ~= "meta" and action ~= "chunk" and action ~= "events") then
        return {ok = false, error = "invalid_action"}
    end
    if typeof(matchId) ~= "string" or #matchId > 100 or not matchId:match("^[%w:_%-]+$") then
        return {ok = false, error = "invalid_match_id"}
    end
    if (action == "chunk" or action == "events") and (typeof(chunkIndex) ~= "number" or chunkIndex ~= math.floor(chunkIndex) or chunkIndex < 0 or chunkIndex > 49) then
        return {ok = false, error = "invalid_chunk"}
    end

    local now = os.clock()
    -- Metadata requests are infrequent; chunks can be legitimately requested in bursts
    -- by the Replay Theater client. A 0.15s per-chunk cooldown blocked chunk 0.
    if action == "meta" then
        if now - (lastCalls[player] or -100) < 1 then
            return {ok = false, error = "too_many_requests_meta" }
        end
        lastCalls[player] = now
    elseif activeMatch[player] ~= matchId then
        return {ok = false, error = "open_meta_first" }
    end

    local usage = requestCounts[player]
    if not usage or now - usage.windowStart >= REQUEST_WINDOW then
        usage = {windowStart = now, count = 0, inFlight = 0}
        requestCounts[player] = usage
    end
    if usage.count >= MAX_REQUESTS_PER_WINDOW then
        return {ok = false, error = "download_limit_30s" }
    end
    if usage.inFlight >= MAX_CONCURRENT_REQUESTS then
        return {ok = false, error = "too_many_simultaneous_downloads" }
    end
    usage.count += 1
    usage.inFlight += 1
    local kind = action == "meta" and "meta" or (action == "events" and "events" or "chunk")
    local result = getFromDashboard(kind, matchId, chunkIndex)
    usage.inFlight -= 1

    if result.ok and action == "meta" then
        activeMatch[player] = matchId
    end
    if result.ok and action == "chunk" and (typeof(result.data.frames) ~= "table" or #result.data.frames > 40) then
        return {ok = false, error = "invalid_chunk_frames" }
    end
    if result.ok and action == "events" and (typeof(result.data.events) ~= "table" or #result.data.events > 40) then
        return {ok = false, error = "invalid_chunk_events" }
    end
    return result
end

Players.PlayerRemoving:Connect(function(p)
    lastCalls[p] = nil
    requestCounts[p] = nil
    activeMatch[p] = nil
end)
print("[PESADILLA Replay V2] Bridge listo; configura ADMIN_USER_IDS antes de publicar")

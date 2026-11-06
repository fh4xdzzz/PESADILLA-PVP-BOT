-- ModuleScript: ServerScriptService/PesadillaMatchReporter
-- Llama ReportMatch solamente desde el controlador de rondas en el servidor.
-- Habilita HTTP Requests y añade el secreto PVP_DASHBOARD_INGEST en Roblox Creator Hub.
local HttpService = game:GetService("HttpService")
local Reporter = {}
local ENDPOINT = "https://pesadilla-pvp-dashboard.fh4xdzzzz.workers.dev/api/ingest/match"

function Reporter.ReportMatch(matchId, startedAt, players)
    assert(type(matchId) == "string" and #matchId > 0, "matchId requerido")
    assert(type(startedAt) == "string", "startedAt debe ser texto ISO UTC")
    assert(type(players) == "table", "players debe ser una tabla")
    local endTime = DateTime.now():ToIsoDate()
    local payload = {
        matchId = matchId,
        serverJobId = game.JobId ~= "" and game.JobId or "studio-test",
        startedAt = startedAt,
        endedAt = endTime,
        players = players
    }
    local ok, result = pcall(function()
        return HttpService:RequestAsync({
            Url = ENDPOINT,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["Authorization"] = HttpService:GetSecret("PVP_DASHBOARD_INGEST"):AddPrefix("Bearer ")
            },
            Body = HttpService:JSONEncode(payload)
        })
    end)
    if not ok then
        warn("[PESADILLA] Error enviando partida, revisa HTTP y el secret store")
        return false
    end
    if not result.Success then
        warn("[PESADILLA] API de partidas respondió HTTP " .. tostring(result.StatusCode))
        return false
    end
    return true
end

return Reporter

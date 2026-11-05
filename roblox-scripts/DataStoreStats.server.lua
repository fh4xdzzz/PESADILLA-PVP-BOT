-- DataStoreStats.server.lua
-- Script de servidor para PESADILLA PVP — guarda estadísticas de jugadores en DataStore
-- REQUISITO: Crear API key en Creator Dashboard con scope universe.datastore:write
-- Y configurar OPEN_CLOUD_API_KEY en la configuración del juego (ScriptService)

local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")

local STATS_DS_NAME = "PVPStats_v1"
local LEADERBOARD_DS_NAME = "PVPLeaderboard_v1"
local OPEN_CLOUD_API_KEY = game:GetService("ServerStorage"):FindFirstChild("OPEN_CLOUD_API_KEY") or "YOUR_API_KEY_HERE"
local UNIVERSE_ID = game:GetService("GameService"):GetUniverseId()

local statsDataStore = DataStoreService:GetDataStore(STATS_DS_NAME)
local leaderboardDataStore = DataStoreService:GetOrderedDataStore(LEADERBOARD_DS_NAME)

local function createSessionStats(player)
    return {
        kills = 0,
        deaths = 0,
        wins = 0,
        losses = 0,
        currentStreak = 0,
        matchStart = tick(),
    }
end

local sessionStats = {}

-- Cuando un jugador entra
Players.PlayerAdded:Connect(function(player)
    sessionStats[player.UserId] = createSessionStats(player)
end)

-- Cuando un jugador sale
Players.PlayerRemoving:Connect(function(player)
    local session = sessionStats[player.UserId]
    if not session then return end

    -- Guardar estadísticas en DataStore (vía Open Cloud si está configurado, fallback a DataStoreService)
    local ok, result = pcall(function()
        -- Leer estadísticas previas
        local prev = statsDataStore:GetAsync(tostring(player.UserId)) or {
            kills = 0, deaths = 0, wins = 0, losses = 0,
            currentStreak = 0, bestStreak = 0, playtimeSeconds = 0, matchesPlayed = 0,
        }

        -- Actualizar
        prev.kills = (prev.kills or 0) + session.kills
        prev.deaths = (prev.deaths or 0) + session.deaths
        prev.wins = (prev.wins or 0) + session.wins
        prev.losses = (prev.losses or 0) + session.losses
        prev.currentStreak = session.currentStreak
        if session.currentStreak > (prev.bestStreak or 0) then
            prev.bestStreak = session.currentStreak
        end
        prev.playtimeSeconds = (prev.playtimeSeconds or 0) + (tick() - session.matchStart)
        prev.matchesPlayed = (prev.matchesPlayed or 0) + 1

        -- Guardar en DataStoreService (funciona sin API key)
        statsDataStore:SetAsync(tostring(player.UserId), prev)

        -- Si hay API key de Open Cloud, también guardar allí para acceso externo
        if OPEN_CLOUD_API_KEY and OPEN_CLOUD_API_KEY.Value ~= "YOUR_API_KEY_HERE" then
            local url = string.format("https://apis.roblox.com/cloud/v2/universes/%s/data-stores/%s/entries/%s",
                UNIVERSE_ID, STATS_DS_NAME, player.UserId)
            local success, err = pcall(function()
                local response = HttpService:RequestAsync({
                    Url = url,
                    Method = "POST",
                    Headers = {
                        ["x-api-key"] = OPEN_CLOUD_API_KEY.Value,
                        ["Content-Type"] = "application/json",
                    },
                    Body = HttpService:JSONEncode({ value = HttpService:JSONEncode(prev) }),
                })
                if response.StatusCode >= 400 then
                    warn("Open Cloud stats sync failed: " .. response.StatusCode)
                end
            end)
            if not success then warn("Open Cloud sync error: " .. tostring(err)) end
        end

        -- Actualizar leaderboard (por kills)
        leaderboardDataStore:SetAsync(tostring(player.UserId), prev.kills or 0)
    end)

    if not ok then
        warn("Error guardando stats para " .. player.Name .. ": " .. tostring(result))
    end

    sessionStats[player.UserId] = nil
end)

-- API simple para scripts del juego registrar eventos
_G.PVPStats = {}

function _G.PVPStats.RecordKill(attackerId, victimId)
    if sessionStats[attackerId] then
        sessionStats[attackerId].kills += 1
        sessionStats[attackerId].currentStreak += 1
    end
    if sessionStats[victimId] then
        sessionStats[victimId].deaths += 1
        sessionStats[victimId].currentStreak = 0
    end
end

function _G.PVPStats.RecordWin(playerId)
    if sessionStats[playerId] then
        sessionStats[playerId].wins += 1
    end
end

function _G.PVPStats.RecordLoss(playerId)
    if sessionStats[playerId] then
        sessionStats[playerId].losses += 1
    end
end

print("PVPStats: DataStoreStats inicializado")

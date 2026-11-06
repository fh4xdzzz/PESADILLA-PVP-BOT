-- Script (not ModuleScript): ServerScriptService/PESADILLA_ReportServer
-- Never accept reporterUserId or credentials from the client.
-- Requires HTTP Requests enabled and PVP_DASHBOARD_INGEST in Creator Hub Secret Store.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local TextService = game:GetService("TextService")

local ENDPOINT = "https://pesadilla-pvp-dashboard.fh4xdzzzz.workers.dev/api/ingest/report"
local REMOTE_NAME = "PESADILLA_ReportPlayer"
local CATEGORIES = {
    cheating = true, exploiting = true, harassment = true,
    griefing = true, other = true
}
local cooldown = {}
local event = ReplicatedStorage:FindFirstChild(REMOTE_NAME)
if not event then
    event = Instance.new("RemoteEvent")
    event.Name = REMOTE_NAME
    event.Parent = ReplicatedStorage
end

local function respond(player, success, message)
    if player.Parent == Players then
        event:FireClient(player, success, message)
    end
end

event.OnServerEvent:Connect(function(player, targetUserId, category, description)
    if typeof(targetUserId) ~= "number" or targetUserId % 1 ~= 0
        or typeof(category) ~= "string" or not CATEGORIES[category]
        or typeof(description) ~= "string" then
        respond(player, false, "Datos del reporte inválidos.")
        return
    end
    local message = description:match("^%s*(.-)%s*$")
    if not message or #message < 5 or #message > 240 then
        respond(player, false, "Escribe un motivo de 5 a 240 caracteres.")
        return
    end
    local target = Players:GetPlayerByUserId(targetUserId)
    if not target or target == player then
        respond(player, false, "Selecciona otro jugador que esté en este servidor.")
        return
    end
    if cooldown[player.UserId] and os.clock() - cooldown[player.UserId] < 60 then
        respond(player, false, "Espera un minuto antes de enviar otro reporte.")
        return
    end
    cooldown[player.UserId] = os.clock()

    task.spawn(function()
        -- Text must be filtered before persistent storage or display to staff.
        local filteredOk, filtered = pcall(function()
            local result = TextService:FilterStringAsync(
                message, player.UserId, Enum.TextFilterContext.PublicChat
            )
            return result:GetNonChatStringForBroadcastAsync()
        end)
        if not filteredOk or typeof(filtered) ~= "string" or #filtered < 5 then
            respond(player, false, "No se pudo filtrar el texto. Inténtalo más tarde.")
            return
        end
        local data = {
            reportId = HttpService:GenerateGUID(false),
            reporterUserId = tostring(player.UserId),
            targetUserId = tostring(target.UserId),
            category = category,
            description = filtered:sub(1, 240),
            filtered = true
        }
        local success, result = pcall(function()
            return HttpService:RequestAsync({
                Url = ENDPOINT,
                Method = "POST",
                Headers = {
                    ["Content-Type"] = "application/json",
                    ["Authorization"] = HttpService:GetSecret("PVP_DASHBOARD_INGEST"):AddPrefix("Bearer ")
                },
                Body = HttpService:JSONEncode(data)
            })
        end)
        if not success then
            warn("[PESADILLA Reports] Solicitud HTTP fallida (verificar Secret Store y HTTP)")
            respond(player, false, "No fue posible enviar el reporte.")
            return
        end
        if result.Success then
            respond(player, true, "Reporte enviado. Nuestro equipo lo revisará.")
        elseif result.StatusCode == 429 then
            respond(player, false, "Has enviado demasiados reportes. Inténtalo más tarde.")
        else
            warn("[PESADILLA Reports] API respondió HTTP " .. tostring(result.StatusCode))
            respond(player, false, "El reporte no pudo guardarse. Inténtalo después.")
        end
    end)
end)

Players.PlayerRemoving:Connect(function(player)
    cooldown[player.UserId] = nil
end)
print("[PESADILLA Reports] Sistema de reportes del servidor listo")

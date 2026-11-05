-- LinkCodeValidator.server.lua
-- Script de servidor para validar códigos de vinculación Discord ↔ Roblox
-- El bot genera un código (ej. PVP-A1B2C3D4) que el jugador ingresa en el juego.
-- Este script hace una llamada HTTP al backend del bot para consumir el código.

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- Configura aquí la URL pública de tu endpoint de vinculación (si expones uno)
-- Alternativa: usar un MessageService (Server→Server) si prefiere evitar HTTP
local LINK_ENDPOINT_URL = "https://tu-bot-url.vercel.app/api/link/validate" -- CONFIGURAR ESTO

local function validateLinkCode(player, code)
    if #code < 4 or #code > 16 then
        return false, "Código inválido (debe tener 4-16 caracteres)"
    end

    local success, result = pcall(function()
        local response = HttpService:RequestAsync({
            Url = LINK_ENDPOINT_URL,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
            },
            Body = HttpService:JSONEncode({
                code = code,
                robloxUserId = player.UserId,
                robloxName = player.Name,
            }),
        })
        if response.StatusCode == 200 then
            local body = HttpService:JSONDecode(response.Body)
            return body.success == true
        else
            return false, "Código inválido o expirado"
        end
    end)

    if not success then
        return false, "Error de conexión con el servidor de vinculación"
    end

    return result, nil
end

-- Comando de chat para vincular (opcional)
Players.PlayerAdded:Connect(function(player)
    player.Chatted:Connect(function(msg)
        if msg:sub(1, 8):lower() == "/vincular" then
            local code = msg:sub(10):match("%S+")
            if not code then
                player:SendSystemMessage("Uso: /vincular PVP-XXXXX", "Console")
                return
            end
            local ok, err = validateLinkCode(player, code)
            if ok then
                player:SendSystemMessage("✅ Cuenta vinculada correctamente con Discord.", "Console")
            else
                player:SendSystemMessage("❌ " .. (err or "Fallo al vincular"), "Console")
            end
        end
    end)
end)

print("LinkCodeValidator inicializado")

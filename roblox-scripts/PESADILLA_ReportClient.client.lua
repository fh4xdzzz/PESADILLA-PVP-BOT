-- PESADILLA_ReportClient (LocalScript)
-- Instalar en StarterPlayer > StarterPlayerScripts.
-- La ventana funciona aun si el RemoteEvent del servidor falta.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

print("[PESADILLA Reports UI] LocalScript iniciado:", script:GetFullName())

local old = playerGui:FindFirstChild("PESADILLA_ReportsUI")
if old then old:Destroy() end

local gui = Instance.new("ScreenGui")
gui.Name = "PESADILLA_ReportsUI"
gui.ResetOnSpawn = false
gui.DisplayOrder = 10000
gui.ZIndexBehavior = Enum.ZIndexBehavior.Global
gui.IgnoreGuiInset = true
gui.Enabled = true
gui.Parent = playerGui

local function new(class, properties, parent)
    local obj = Instance.new(class)
    for key, value in pairs(properties) do obj[key] = value end
    obj.Parent = parent
    return obj
end

local bg = Color3.fromRGB(19, 16, 24)
local surface = Color3.fromRGB(41, 30, 40)
local accent = Color3.fromRGB(188, 42, 69)
local white = Color3.fromRGB(255, 240, 246)
local soft = Color3.fromRGB(193, 170, 183)
local function rounded(object, radius)
    new("UICorner",{CornerRadius=UDim.new(0,radius or 10)},object)
end
local function button(parent,name,label,pos,size,color,z)
    local b=new("TextButton",{
        Name=name,Text=label,Font=Enum.Font.GothamBold,TextSize=14,
        TextColor3=white,BackgroundColor3=color or surface,
        BorderSizePixel=0,AutoButtonColor=true,
        Position=pos,Size=size,ZIndex=z or 10
    },parent)
    rounded(b,9)
    return b
end

local open = button(gui,"OpenReport","REPORTAR",UDim2.new(1,-148,0,75),
    UDim2.fromOffset(136,43),accent,10)
open.AnchorPoint=Vector2.new(0,0)

local overlay = new("TextButton",{
    Name="ReportOverlay",Text="",AutoButtonColor=false,
    Size=UDim2.fromScale(1,1),Position=UDim2.fromScale(0,0),
    BackgroundColor3=Color3.fromRGB(5,3,8),BackgroundTransparency=.28,
    BorderSizePixel=0,Visible=false,ZIndex=20
},gui)

local modal=new("Frame",{
    Name="ReportWindow",Visible=false,AnchorPoint=Vector2.new(.5,.5),
    Position=UDim2.fromScale(.5,.5),Size=UDim2.new(.94,0,0,430),
    BackgroundColor3=bg,BorderSizePixel=0,ZIndex=30
},gui)
rounded(modal,15)
new("UISizeConstraint",{MaxSize=Vector2.new(390,440)},modal)
new("UIStroke",{Color=Color3.fromRGB(103,45,65),Thickness=2},modal)

new("TextLabel",{
    Text="REPORTAR JUGADOR",Font=Enum.Font.GothamBold,TextSize=20,
    TextColor3=white,BackgroundTransparency=1,TextXAlignment=Enum.TextXAlignment.Left,
    Position=UDim2.fromOffset(17,12),Size=UDim2.new(1,-75,0,38),ZIndex=31
},modal)
local close=button(modal,"Close","X",UDim2.new(1,-48,0,13),
    UDim2.fromOffset(34,34),surface,35)

local selectedUserId
local choose=button(modal,"ChoosePlayer","SELECCIONAR JUGADOR",
    UDim2.fromOffset(17,66),UDim2.new(1,-34,0,43),surface,32)
choose.TextSize=12
local list=new("ScrollingFrame",{
    Name="PlayerList",Visible=false,Position=UDim2.fromOffset(17,110),
    Size=UDim2.new(1,-34,0,115),BackgroundColor3=surface,
    BorderSizePixel=0,AutomaticCanvasSize=Enum.AutomaticSize.Y,
    CanvasSize=UDim2.new(),ScrollBarThickness=4,ZIndex=45
},modal)
rounded(list,8)
new("UIListLayout",{Padding=UDim.new(0,3)},list)

local categories={
    {id="cheating",label="TRAMPAS / HACKS"},
    {id="exploiting",label="EXPLOITS"},
    {id="harassment",label="ACOSO / INSULTOS"},
    {id="griefing",label="CONDUCTA ANTIDEPORTIVA"},
    {id="other",label="OTRO"}
}
local selectedCategory=1
local category=button(modal,"Category","MOTIVO: "..categories[1].label,
    UDim2.fromOffset(17,127),UDim2.new(1,-34,0,43),surface,32)
category.TextSize=12
local description=new("TextBox",{
    Name="Description",Text="",PlaceholderText="Describe lo ocurrido (5-240 caracteres)",
    PlaceholderColor3=soft,TextColor3=white,Font=Enum.Font.Gotham,
    TextSize=13,ClearTextOnFocus=false,MultiLine=true,TextWrapped=true,
    TextXAlignment=Enum.TextXAlignment.Left,TextYAlignment=Enum.TextYAlignment.Top,
    Position=UDim2.fromOffset(17,188),Size=UDim2.new(1,-34,0,118),
    BackgroundColor3=surface,BorderSizePixel=0,ZIndex=32
},modal)
rounded(description,9)
new("UIPadding",{PaddingTop=UDim.new(0,9),PaddingLeft=UDim.new(0,10),
    PaddingRight=UDim.new(0,10)},description)
local status=new("TextLabel",{
    Name="Status",Text="Selecciona otro jugador que esté en el servidor.",
    TextColor3=soft,Font=Enum.Font.Gotham,TextSize=11,TextWrapped=true,
    BackgroundTransparency=1,Position=UDim2.fromOffset(17,315),
    Size=UDim2.new(1,-34,0,40),ZIndex=32
},modal)
local submit=button(modal,"Submit","ENVIAR REPORTE",
    UDim2.fromOffset(17,366),UDim2.new(1,-34,0,45),accent,32)
local busy=false
local function setOpen(value)
    overlay.Visible=value
    modal.Visible=value
    list.Visible=false
    print("[PESADILLA Reports UI] Ventana",value and "ABIERTA" or "CERRADA")
end

-- Connect basic buttons before any remote call.
open.Activated:Connect(function() setOpen(not modal.Visible) end)
close.Activated:Connect(function() setOpen(false) end)
overlay.Activated:Connect(function() setOpen(false) end)

local function populate()
    for _,child in ipairs(list:GetChildren()) do
        if child:IsA("TextButton") then child:Destroy() end
    end
    local count=0
    for _,target in ipairs(Players:GetPlayers()) do
        if target~=player then
            count+=1
            local entry=button(list,"Player_"..target.UserId,"@"..target.Name,
                UDim2.new(),UDim2.new(1,-8,0,34),Color3.fromRGB(65,40,54),47)
            entry.LayoutOrder=count
            entry.TextSize=12
            entry.Activated:Connect(function()
                selectedUserId=target.UserId
                choose.Text="JUGADOR: @"..target.Name
                list.Visible=false
            end)
        end
    end
    if count==0 then status.Text="Necesitas dos jugadores en el servidor para probar." end
end
choose.Activated:Connect(function()
    populate()
    list.Visible=not list.Visible
end)
category.Activated:Connect(function()
    selectedCategory=selectedCategory%#categories+1
    category.Text="MOTIVO: "..categories[selectedCategory].label
end)

local remote = ReplicatedStorage:FindFirstChild("PESADILLA_ReportPlayer")
if not remote then
    status.Text="Interfaz lista. Esperando el Script del servidor..."
    print("[PESADILLA Reports UI] Botón y ventana listos; esperando RemoteEvent del servidor")
end
task.spawn(function()
    remote=ReplicatedStorage:WaitForChild("PESADILLA_ReportPlayer",20)
    if not remote or not remote:IsA("RemoteEvent") then
        warn("[PESADILLA Reports UI] RemoteEvent PESADILLA_ReportPlayer NO encontrado. Verifica PESADILLA_ReportServer en ServerScriptService.")
        status.Text="El sistema de reportes del servidor no está conectado."
        return
    end
    print("[PESADILLA Reports UI] RemoteEvent conectado")
    remote.OnClientEvent:Connect(function(success,message)
        busy=false
        submit.Text="ENVIAR REPORTE"
        status.Text=tostring(message)
        if success then
            selectedUserId=nil
            choose.Text="SELECCIONAR JUGADOR"
            description.Text=""
        end
    end)
end)
submit.Activated:Connect(function()
    if busy then return end
    if not remote or not remote:IsA("RemoteEvent") then
        status.Text="No hay conexión con el Script del servidor."
        return
    end
    if not selectedUserId then
        status.Text="Selecciona un jugador para reportar."
        return
    end
    if #description.Text<5 or #description.Text>240 then
        status.Text="El motivo debe tener entre 5 y 240 caracteres."
        return
    end
    busy=true
    submit.Text="ENVIANDO..."
    status.Text="Enviando al servidor..."
    remote:FireServer(selectedUserId,categories[selectedCategory].id,description.Text)
end)
print("[PESADILLA Reports UI] LISTO. Pulsa REPORTAR para abrir la ventana.")

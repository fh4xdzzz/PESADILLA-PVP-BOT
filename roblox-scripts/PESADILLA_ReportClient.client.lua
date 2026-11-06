-- LocalScript: StarterPlayer/StarterPlayerScripts/PESADILLA_ReportClient
-- Simple in-game report window. Server validates all inputs.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer
local remote = ReplicatedStorage:WaitForChild("PESADILLA_ReportPlayer")
local gui = Instance.new("ScreenGui")
gui.Name = "PESADILLA_ReportsUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = player:WaitForChild("PlayerGui")

local function make(class,props,parent)
    local object=Instance.new(class)
    for k,v in pairs(props) do object[k]=v end
    object.Parent=parent
    return object
end
local background=Color3.fromRGB(18,15,23)
local red=Color3.fromRGB(178,45,69)
local text=Color3.fromRGB(242,231,235)
local gray=Color3.fromRGB(174,159,169)
local openButton=make("TextButton",{
    Name="OpenReport",Text="⚑ REPORTAR",Size=UDim2.fromOffset(132,40),
    Position=UDim2.new(1,-145,0,75),BackgroundColor3=red,
    TextColor3=text,TextSize=14,Font=Enum.Font.GothamBold,AutoButtonColor=true
},gui)
make("UICorner",{CornerRadius=UDim.new(0,10)},openButton)
local modal=make("Frame",{
    Name="ReportWindow",Size=UDim2.new(0,370,0,410),AnchorPoint=Vector2.new(0.5,0.5),
    Position=UDim2.fromScale(0.5,0.5),BackgroundColor3=background,
    BorderSizePixel=0,Visible=false
},gui)
make("UICorner",{CornerRadius=UDim.new(0,16)},modal)
make("UIStroke",{Color=Color3.fromRGB(95,39,57),Thickness=1},modal)
make("UISizeConstraint",{MaxSize=Vector2.new(370,410),MinSize=Vector2.new(260,360)},modal)
make("TextLabel",{
    Text="REPORTAR JUGADOR",Font=Enum.Font.GothamBold,TextSize=20,
    TextColor3=text,BackgroundTransparency=1,Size=UDim2.new(1,-60,0,50),
    Position=UDim2.fromOffset(18,8),TextXAlignment=Enum.TextXAlignment.Left
},modal)
local close=make("TextButton",{
    Text="×",Font=Enum.Font.GothamBold,TextSize=25,
    TextColor3=gray,BackgroundTransparency=1,Size=UDim2.fromOffset(38,38),
    Position=UDim2.new(1,-42,0,10)
},modal)
local selectedUserId=nil
local playerChoice=make("TextButton",{
    Text="Seleccionar jugador ▼",Font=Enum.Font.Gotham,
    TextColor3=text,TextSize=13,BackgroundColor3=Color3.fromRGB(38,28,36),
    Position=UDim2.fromOffset(18,75),Size=UDim2.new(1,-36,0,42)
},modal)
make("UICorner",{CornerRadius=UDim.new(0,8)},playerChoice)
local pickList=make("ScrollingFrame",{
    Visible=false,Position=UDim2.fromOffset(18,118),Size=UDim2.new(1,-36,0,110),
    CanvasSize=UDim2.fromOffset(0,0),AutomaticCanvasSize=Enum.AutomaticSize.Y,
    ScrollBarThickness=5,BackgroundColor3=Color3.fromRGB(36,26,35),BorderSizePixel=0,
    ZIndex=5
},modal)
make("UICorner",{CornerRadius=UDim.new(0,8)},pickList)
make("UIListLayout",{Padding=UDim.new(0,3),SortOrder=Enum.SortOrder.LayoutOrder},pickList)
local categories={
    {id="cheating",label="Trampas / hacks"},
    {id="exploiting",label="Exploits"},
    {id="harassment",label="Acoso / insultos"},
    {id="griefing",label="Conducta antideportiva"},
    {id="other",label="Otro"},
}
local categoryIndex=1
local categoryButton=make("TextButton",{
    Text="Motivo: "..categories[1].label,Font=Enum.Font.Gotham,
    TextColor3=text,TextSize=13,BackgroundColor3.fromRGB(38,28,36),
    Position=UDim2.fromOffset(18,135),Size=UDim2.new(1,-36,0,42)
},modal)
make("UICorner",{CornerRadius=UDim.new(0,8)},categoryButton)
local description=make("TextBox",{
    PlaceholderText="Describe lo ocurrido (5-240 caracteres)",
    PlaceholderColor3=gray,Text="",ClearTextOnFocus=false,MultiLine=true,
    TextWrapped=true,TextYAlignment=Enum.TextYAlignment.Top,TextXAlignment=Enum.TextXAlignment.Left,
    Font=Enum.Font.Gotham,TextColor3=text,TextSize=13,
    BackgroundColor3=Color3.fromRGB(32,26,33),
    Position=UDim2.fromOffset(18,193),Size=UDim2.new(1,-36,0,112)
},modal)
make("UICorner",{CornerRadius=UDim.new(0,8)},description)
local padding=make("UIPadding",{PaddingTop=UDim.new(0,9),PaddingLeft=UDim.new(0,10),PaddingRight=UDim.new(0,10)},description)
local status=make("TextLabel",{
    Text="Los reportes falsos pueden revisarse.",TextColor3=gray,TextSize=11,
    Font=Enum.Font.Gotham,BackgroundTransparency=1,
    Position=UDim2.fromOffset(18,311),Size=UDim2.new(1,-36,0,30),
    TextWrapped=true
},modal)
local submit=make("TextButton",{
    Text="ENVIAR REPORTE",Font=Enum.Font.GothamBold,TextSize=14,
    TextColor3=text,BackgroundColor3=red,
    Position=UDim2.fromOffset(18,353),Size=UDim2.new(1,-36,0,42)
},modal)
make("UICorner",{CornerRadius=UDim.new(0,8)},submit)
local function populate()
    for _,child in ipairs(pickList:GetChildren()) do
        if child:IsA("TextButton") then child:Destroy() end
    end
    for _,target in ipairs(Players:GetPlayers()) do
        if target~=player then
            local item=make("TextButton",{
                Text=target.DisplayName.." (@"..target.Name..")",Font=Enum.Font.Gotham,
                TextSize=12,TextColor3=text,TextXAlignment=Enum.TextXAlignment.Left,
                BackgroundColor3=Color3.fromRGB(48,34,44),
                Size=UDim2.new(1,-6,0,31),ZIndex=6
            },pickList)
            item.MouseButton1Click:Connect(function()
                selectedUserId=target.UserId
                playerChoice.Text="Jugador: @"..target.Name
                pickList.Visible=false
            end)
        end
    end
end
openButton.MouseButton1Click:Connect(function()
    modal.Visible=not modal.Visible
    pickList.Visible=false
end)
close.MouseButton1Click:Connect(function()
    modal.Visible=false
    pickList.Visible=false
end)
playerChoice.MouseButton1Click:Connect(function()
    populate()
    pickList.Visible=not pickList.Visible
end)
categoryButton.MouseButton1Click:Connect(function()
    categoryIndex=categoryIndex%#categories+1
    categoryButton.Text="Motivo: "..categories[categoryIndex].label
end)
local busy=false
submit.MouseButton1Click:Connect(function()
    if busy then return end
    if not selectedUserId then status.Text="Selecciona un jugador." return end
    if #description.Text<5 or #description.Text>240 then
        status.Text="El motivo debe tener entre 5 y 240 caracteres."
        return
    end
    busy=true
    submit.Text="ENVIANDO..."
    status.Text="Procesando reporte..."
    remote:FireServer(selectedUserId,categories[categoryIndex].id,description.Text)
end)
remote.OnClientEvent:Connect(function(success,message)
    busy=false
    submit.Text="ENVIAR REPORTE"
    status.Text=tostring(message)
    if success then
        description.Text=""
        selectedUserId=nil
        playerChoice.Text="Seleccionar jugador ▼"
    end
end)

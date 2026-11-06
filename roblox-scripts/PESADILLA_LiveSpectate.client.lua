-- StarterPlayer/StarterPlayerScripts/PESADILLA_LiveSpectate.client.lua
-- Real-time spectate: follow a character in its ORIGINAL game server.
-- F6 opens selector; admin panel can call ReplicatedStorage.PESADILLA_OpenLiveSpectate:Fire().
local Players=game:GetService("Players")
local RS=game:GetService("ReplicatedStorage")
local UIS=game:GetService("UserInputService")
local player=Players.LocalPlayer
local rpc=RS:WaitForChild("PESADILLA_LiveSpectateRPC",20)
local events=RS:WaitForChild("PESADILLA_LiveSpectateSignal",20)
if not rpc or not events then return end
local function make(class,props,parent)
 local o=Instance.new(class)
 for k,v in pairs(props or {}) do o[k]=v end
 o.Parent=parent
 return o
end
local gui=make("ScreenGui",{Name="PESADILLA_LiveSpectateUI",DisplayOrder=11000,ResetOnSpawn=false},player:WaitForChild("PlayerGui"))
local outer=make("Frame",{Size=UDim2.fromOffset(650,425),AnchorPoint=Vector2.new(.5,.5),Position=UDim2.fromScale(.5,.5),BackgroundColor3=Color3.fromRGB(15,13,20),Visible=false},gui)
make("UICorner",{CornerRadius=UDim.new(0,12)},outer)
make("UIStroke",{Color=Color3.fromRGB(169,47,72),Thickness=1.5},outer)
make("TextLabel",{Text="PESADILLA PVP  /  PARTIDAS EN VIVO",TextColor3=Color3.fromRGB(255,235,243),TextSize=20,Font=Enum.Font.GothamBold,TextXAlignment=Enum.TextXAlignment.Left,BackgroundTransparency=1,Size=UDim2.new(1,-70,0,54),Position=UDim2.fromOffset(18,0)},outer)
local close=make("TextButton",{Text="X",TextColor3=Color3.new(1,1,1),BackgroundColor3=Color3.fromRGB(150,30,55),Size=UDim2.fromOffset(35,32),Position=UDim2.new(1,-48,0,11)},outer)
local search=make("TextBox",{Size=UDim2.new(1,-225,0,40),Position=UDim2.fromOffset(16,61),Text="",PlaceholderText="Busca jugador, UserId o partida de cualquier servidor",ClearTextOnFocus=false,TextColor3=Color3.new(1,1,1),BackgroundColor3=Color3.fromRGB(33,30,41),TextSize=14,Font=Enum.Font.Gotham},outer)
local refresh=make("TextButton",{Text="BUSCAR / ACTUALIZAR",Size=UDim2.fromOffset(178,40),Position=UDim2.new(1,-194,0,61),BackgroundColor3=Color3.fromRGB(159,36,67),TextColor3=Color3.new(1,1,1),Font=Enum.Font.GothamBold,TextSize=12},outer)
local status=make("TextLabel",{Text="Partidas activas de todos los servidores públicos",TextColor3=Color3.fromRGB(190,177,189),BackgroundTransparency=1,TextSize=12,Font=Enum.Font.Gotham,TextXAlignment=Enum.TextXAlignment.Left,Size=UDim2.new(1,-30,0,25),Position=UDim2.fromOffset(17,111)},outer)
local scroller=make("ScrollingFrame",{Position=UDim2.fromOffset(16,143),Size=UDim2.new(1,-32,1,-159),BackgroundColor3=Color3.fromRGB(18,18,25),BorderSizePixel=0,CanvasSize=UDim2.fromOffset(0,0),ScrollBarThickness=5,AutomaticCanvasSize=Enum.AutomaticSize.Y},outer)
local rows=make("UIListLayout",{Padding=UDim.new(0,7),SortOrder=Enum.SortOrder.LayoutOrder},scroller)
local historyPanel=make("Frame",{Size=UDim2.fromOffset(650,425),AnchorPoint=Vector2.new(.5,.5),Position=UDim2.fromScale(.5,.5),BackgroundColor3=Color3.fromRGB(15,13,20),Visible=false},gui)
make("UICorner",{CornerRadius=UDim.new(0,12)},historyPanel)
local historyTitle=make("TextLabel",{Text="HISTORIAL DE PARTIDAS",Size=UDim2.new(1,-75,0,56),Position=UDim2.fromOffset(17,0),BackgroundTransparency=1,TextColor3=Color3.new(1,1,1),TextSize=18,TextXAlignment=Enum.TextXAlignment.Left,Font=Enum.Font.GothamBold},historyPanel)
local historyClose=make("TextButton",{Text="VOLVER",Size=UDim2.fromOffset(94,32),Position=UDim2.new(1,-108,0,12),BackgroundColor3=Color3.fromRGB(158,36,62),TextColor3=Color3.new(1,1,1)},historyPanel)
local historyRows=make("ScrollingFrame",{Size=UDim2.new(1,-32,1,-80),Position=UDim2.fromOffset(16,65),BackgroundColor3=Color3.fromRGB(23,19,28),BorderSizePixel=0,ScrollBarThickness=6,AutomaticCanvasSize=Enum.AutomaticSize.Y,CanvasSize=UDim2.fromOffset(0,0)},historyPanel)
make("UIListLayout",{Padding=UDim.new(0,6),SortOrder=Enum.SortOrder.LayoutOrder},historyRows)
local watchBar=make("Frame",{Size=UDim2.fromOffset(370,52),Position=UDim2.new(.5,-185,0,62),BackgroundColor3=Color3.fromRGB(18,16,25),Visible=false},gui)
make("UICorner",{CornerRadius=UDim.new(0,9)},watchBar)
local watchLabel=make("TextLabel",{Text="ESPECTANDO",BackgroundTransparency=1,Size=UDim2.fromOffset(245,48),TextColor3=Color3.fromRGB(240,214,226),TextSize=13,Font=Enum.Font.GothamBold},watchBar)
local stopBtn=make("TextButton",{Text="SALIR",Position=UDim2.fromOffset(260,6),Size=UDim2.fromOffset(100,40),BackgroundColor3=Color3.fromRGB(163,40,67),TextColor3=Color3.new(1,1,1),Font=Enum.Font.GothamBold},watchBar)
local function clear(frame)
 for _,child in ipairs(frame:GetChildren()) do if child:IsA("GuiObject") then child:Destroy() end end
end
local function row(parent,text,button,action)
 local line=make("Frame",{Size=UDim2.new(1,-8,0,56),BackgroundColor3=Color3.fromRGB(35,27,37)},parent)
 make("UICorner",{CornerRadius=UDim.new(0,7)},line)
 make("TextLabel",{Text=text,BackgroundTransparency=1,Size=UDim2.new(1,-156,1,0),Position=UDim2.fromOffset(12,0),TextWrapped=true,TextColor3=Color3.fromRGB(235,218,228),TextSize=12,TextXAlignment=Enum.TextXAlignment.Left,Font=Enum.Font.Gotham},line)
 local b=make("TextButton",{Text=button,Size=UDim2.fromOffset(134,38),Position=UDim2.new(1,-144,.5,-19),BackgroundColor3=Color3.fromRGB(149,30,59),TextColor3=Color3.new(1,1,1),Font=Enum.Font.GothamBold,TextSize=12},line)
 b.Activated:Connect(action)
 return line
end
local busy=false
local function query(action,...)
 local args=table.pack(...)
 local ok,r=pcall(function()return rpc:InvokeServer(action,table.unpack(args,1,args.n))end)
 if not ok then return {ok=false,error="server_unavailable"} end
 return r or {ok=false,error="empty_response"}
end
local function showHistory(uid,username,page)
 historyPanel.Visible=true
 outer.Visible=false
 historyTitle.Text="HISTORIAL: "..username.." (Página "..page..")"
 clear(historyRows)
 local response=query("history",uid,page)
 if not response.ok then
  row(historyRows,"No se pudo consultar: "..tostring(response.error),"VOLVER",function()historyPanel.Visible=false;outer.Visible=true end)
  return
 end
 for _,m in ipairs(response.matches or {}) do
  local label=string.format("%s\n%s  |  K:%s D:%s  |  %s",tostring(m.matchId):sub(1,20),tostring(m.startedAt),tostring(m.kills),tostring(m.deaths),m.wins==1 and "VICTORIA" or "SIN VICTORIA")
  row(historyRows,label,"DETALLES",function()
   historyTitle.Text="PARTIDA "..tostring(m.matchId).." — "..tostring(m.status)
  end)
 end
 if response.hasMore then row(historyRows,"Más partidas registradas","SIGUIENTE",function()showHistory(uid,username,page+1)end) end
 if #(response.matches or {})==0 then row(historyRows,"Este jugador todavía no tiene partidas finalizadas registradas.","VOLVER",function()historyPanel.Visible=false;outer.Visible=true end) end
end
local function listMatches()
 if busy then return end
 busy=true
 status.Text="Consultando todos los servidores..."
 local response=query("list",search.Text)
 busy=false
 clear(scroller)
 if not response.ok then status.Text="Error: "..tostring(response.error);return end
 local matches=response.matches or {}
 status.Text=tostring(#matches).." partidas activas encontradas · datos con hasta 45 s de antigüedad"
 for _,m in ipairs(matches) do
  for _,p in ipairs(m.players or {}) do
   local label=p.username.."  (@ ID "..p.userId..")\nPartida "..tostring(m.matchId):sub(1,19).."  •  Servidor "..tostring(m.serverJobId):sub(1,8)
   row(scroller,label,"ESPECTAR",function()
    status.Text="Conectando al servidor del jugador..."
    local result=query("watch",m.matchId,p.userId)
    if not result.ok then status.Text="Error: "..tostring(result.error)
    else outer.Visible=false end
   end)
   -- A second action belongs to the panel's own ROLES/REPLAYS navigation; for
   -- history within this UI use the player's ID in the search and history shortcut.
  end
 end
 if #matches==0 then row(scroller,"No hay partidas activas. Comprueba que los servidores estén publicando actividad.","CERRAR",function()outer.Visible=false end) end
end
local historyBtn=make("TextButton",{Text="HISTORIAL POR ID",Size=UDim2.fromOffset(150,27),Position=UDim2.new(1,-170,0,113),BackgroundColor3=Color3.fromRGB(65,40,55),TextColor3=Color3.new(1,1,1),Font=Enum.Font.GothamBold,TextSize=11},outer)
historyBtn.Activated:Connect(function()
 local id=search.Text:match("^%s*(%d+)%s*$")
 if not id then status.Text="Escribe el UserId numérico en la búsqueda para ver su historial" return end
 showHistory(id,id,1)
end)
refresh.Activated:Connect(listMatches)
close.Activated:Connect(function()outer.Visible=false end)
historyClose.Activated:Connect(function()historyPanel.Visible=false;outer.Visible=true end)
local currentTarget
local function resetCamera()
 local cam=workspace.CurrentCamera
 if not cam then return end
 cam.CameraType=Enum.CameraType.Custom
 local char=player.Character
 local hum=char and char:FindFirstChildWhichIsA("Humanoid")
 if hum then cam.CameraSubject=hum end
end
local function follow(uid)
 local target=Players:GetPlayerByUserId(uid)
 if not target then status.Text="El jugador salió del servidor";return end
 local function attach(character)
  local humanoid=character:WaitForChild("Humanoid",10)
  if currentTarget==uid and humanoid then
   workspace.CurrentCamera.CameraType=Enum.CameraType.Custom
   workspace.CurrentCamera.CameraSubject=humanoid
  end
 end
 if target.Character then attach(target.Character) end
 target.CharacterAdded:Connect(attach)
 watchBar.Visible=true
 watchLabel.Text="ESPECTANDO: "..target.Name
end
events.OnClientEvent:Connect(function(action,a,b)
 if action=="watch" then
  currentTarget=tonumber(a)
  outer.Visible=false;historyPanel.Visible=false
  task.spawn(follow,currentTarget)
 elseif action=="stop" then
  currentTarget=nil;watchBar.Visible=false;resetCamera()
 elseif action=="error" then
  status.Text=tostring(a);outer.Visible=true;watchBar.Visible=false
 end
end)
stopBtn.Activated:Connect(function()
 query("stop")
 currentTarget=nil;watchBar.Visible=false;resetCamera()
 outer.Visible=true
end)
local bind=RS:FindFirstChild("PESADILLA_OpenLiveSpectate")
if not bind then bind=Instance.new("BindableEvent");bind.Name="PESADILLA_OpenLiveSpectate";bind.Parent=RS end
bind.Event:Connect(function()
 outer.Visible=not outer.Visible
 if outer.Visible then task.spawn(listMatches) end
end)
UIS.InputBegan:Connect(function(input,consumed)
 if not consumed and input.KeyCode==Enum.KeyCode.F6 then bind:Fire() end
end)
print("[PESADILLA LiveSpectate] F6 abre partidas de cualquier servidor")

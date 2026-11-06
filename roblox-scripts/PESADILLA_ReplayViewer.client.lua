-- StarterPlayer/StarterPlayerScripts/PESADILLA_ReplayViewer.client.lua
-- Private, in-game 3D playback of recorded Roblox server positions.
-- Requires ServerScriptService/PESADILLA_ReplayAccess and a map template in ReplicatedStorage/PESADILLA_ReplayMaps.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local bridge = ReplicatedStorage:WaitForChild("PESADILLA_ReplayRequest", 15)
if not bridge then warn("[PESADILLA Replay V2] No se encontro el bridge del servidor") return end
local function make(class, props, parent)
    local x = Instance.new(class)
    for k,v in pairs(props or {}) do x[k] = v end
    x.Parent = parent
    return x
end
local gui = make("ScreenGui", {Name="PESADILLA_ReplayViewer",ResetOnSpawn=false,IgnoreGuiInset=true,DisplayOrder=12000},player:WaitForChild("PlayerGui"))
local shell = make("Frame",{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(6,8,14),Visible=false},gui)
local viewport = make("ViewportFrame",{Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(12,15,24),BackgroundTransparency=0,Active=true,Ambient=Color3.fromRGB(170,170,175),LightColor=Color3.fromRGB(255,242,232),LightDirection=Vector3.new(-1,-1,-1)},shell)
local world = make("WorldModel",{},viewport)
local camera = make("Camera",{},viewport)
viewport.CurrentCamera=camera
camera.FieldOfView=65
local top = make("Frame",{Size=UDim2.new(1,0,0,62),BackgroundColor3=Color3.fromRGB(11,11,17),BackgroundTransparency=.12},shell)
make("UIStroke",{Color=Color3.fromRGB(125,38,61),Thickness=1},top)
local title = make("TextLabel",{Size=UDim2.new(.48,0,1,0),Position=UDim2.fromOffset(20,0),BackgroundTransparency=1,Font=Enum.Font.GothamBold,TextSize=20,TextColor3=Color3.fromRGB(255,240,245),TextXAlignment=Enum.TextXAlignment.Left,Text="PESADILLA PVP  /  REPLAY"},top)
local exit=make("TextButton",{Size=UDim2.fromOffset(110,36),Position=UDim2.new(1,-124,0,13),BackgroundColor3=Color3.fromRGB(112,29,52),TextColor3=Color3.new(1,1,1),TextSize=14,Font=Enum.Font.GothamBold,Text="CERRAR"},top)
make("UICorner",{CornerRadius=UDim.new(0,8)},exit)
local panel=make("Frame",{Size=UDim2.fromOffset(480,166),AnchorPoint=Vector2.new(.5,.5),Position=UDim2.fromScale(.5,.5),BackgroundColor3=Color3.fromRGB(19,17,25),Visible=false},gui)
make("UICorner",{CornerRadius=UDim.new(0,12)},panel)
make("UIStroke",{Color=Color3.fromRGB(149,48,72),Thickness=1.5},panel)
local hint=make("TextLabel",{Size=UDim2.new(1,-30,0,42),Position=UDim2.fromOffset(15,10),BackgroundTransparency=1,TextColor3=Color3.fromRGB(245,230,235),Text="ABRIR REPLAY 3D  |  Pega el ID de la partida",Font=Enum.Font.GothamBold,TextSize=16},panel)
local idBox=make("TextBox",{Size=UDim2.new(1,-30,0,42),Position=UDim2.fromOffset(15,55),BackgroundColor3=Color3.fromRGB(35,28,38),TextColor3=Color3.new(1,1,1),PlaceholderColor3=Color3.fromRGB(165,152,160),PlaceholderText="ID exacto de la partida del dashboard",Text="",ClearTextOnFocus=false,Font=Enum.Font.Gotham,TextSize=14},panel)
make("UICorner",{CornerRadius=UDim.new(0,7)},idBox)
local open=make("TextButton",{Size=UDim2.fromOffset(200,38),Position=UDim2.new(.5,-100,1,-54),Text="ABRIR PARTIDA",BackgroundColor3=Color3.fromRGB(169,33,68),TextColor3=Color3.new(1,1,1),Font=Enum.Font.GothamBold,TextSize=14},panel)
make("UICorner",{CornerRadius=UDim.new(0,8)},open)
local overlay=make("Frame",{Size=UDim2.new(1,-24,0,101),Position=UDim2.new(0,12,1,-115),BackgroundColor3=Color3.fromRGB(12,12,20),BackgroundTransparency=.07},shell)
make("UICorner",{CornerRadius=UDim.new(0,12)},overlay)
make("UIStroke",{Color=Color3.fromRGB(105,41,59),Thickness=1},overlay)
local controls=make("Frame",{Size=UDim2.new(1,-28,0,42),Position=UDim2.fromOffset(14,8),BackgroundTransparency=1},overlay)
local play=make("TextButton",{Size=UDim2.fromOffset(105,36),BackgroundColor3=Color3.fromRGB(162,40,69),Text="▶ PLAY",TextColor3=Color3.new(1,1,1),Font=Enum.Font.GothamBold,TextSize=13},controls)
make("UICorner",{CornerRadius=UDim.new(0,7)},play)
local follow=make("TextButton",{Size=UDim2.fromOffset(180,36),Position=UDim2.fromOffset(116,0),BackgroundColor3=Color3.fromRGB(37,33,48),Text="CAMARA LIBRE",TextColor3=Color3.new(1,1,1),Font=Enum.Font.GothamBold,TextSize=13},controls)
make("UICorner",{CornerRadius=UDim.new(0,7)},follow)
local speedButton=make("TextButton",{Size=UDim2.fromOffset(85,36),Position=UDim2.fromOffset(308,0),BackgroundColor3=Color3.fromRGB(37,33,48),Text="1x",TextColor3=Color3.new(1,1,1),Font=Enum.Font.GothamBold,TextSize=13},controls)
make("UICorner",{CornerRadius=UDim.new(0,7)},speedButton)
local stamp=make("TextLabel",{Size=UDim2.new(1,-405,0,36),Position=UDim2.fromOffset(405,0),BackgroundTransparency=1,TextColor3=Color3.fromRGB(247,223,231),TextXAlignment=Enum.TextXAlignment.Right,Font=Enum.Font.GothamBold,TextSize=14,Text="00:00 / 00:00"},controls)
local track=make("Frame",{Size=UDim2.new(1,-30,0,10),Position=UDim2.fromOffset(15,65),BackgroundColor3=Color3.fromRGB(62,52,67),Active=true},overlay)
make("UICorner",{CornerRadius=UDim.new(1,0)},track)
local fill=make("Frame",{Size=UDim2.fromScale(0,1),BackgroundColor3=Color3.fromRGB(237,68,106)},track)
make("UICorner",{CornerRadius=UDim.new(1,0)},fill)
local eventText=make("TextLabel",{Size=UDim2.new(.75,0,0,28),Position=UDim2.new(.5,0,0,75),AnchorPoint=Vector2.new(.5,0),BackgroundColor3=Color3.fromRGB(15,12,19),BackgroundTransparency=.22,TextColor3=Color3.fromRGB(255,223,233),Font=Enum.Font.GothamBold,TextSize=16,Text="",ZIndex=5},shell)
local message=make("TextLabel",{Size=UDim2.new(1,-30,0,17),Position=UDim2.fromOffset(15,81),BackgroundTransparency=1,TextColor3=Color3.fromRGB(220,178,188),Font=Enum.Font.Gotham,TextSize=12,TextXAlignment=Enum.TextXAlignment.Left,Text="F8: abrir visor  |  Arrastra en la escena para girar la camara"},overlay)
local loading=false
local frames={}
local events={}
local objects={}
local ids={}
local duration=0
local current=0
local playing=false
local speed=1
local cameraIndex=0
local azimuth=math.rad(30)
local elevation=math.rad(23)
local distance=28
local dragging=false
local lastPointer=Vector2.zero
local mapModel=nil
local function timeText(n)
    local s=math.floor(math.max(0,n))
    return string.format("%02d:%02d",math.floor(s/60),s%60)
end
local function clearStage()
    for _,child in ipairs(world:GetChildren()) do child:Destroy() end
    table.clear(objects)
    table.clear(ids)
    mapModel=nil
end
local function setupMap()
    local templates=ReplicatedStorage:FindFirstChild("PESADILLA_ReplayMaps")
    local map=templates and (templates:FindFirstChild("Default") or templates:FindFirstChildWhichIsA("Model"))
    if not map then
        message.Text="No hay plantilla de mapa en ReplicatedStorage/PESADILLA_ReplayMaps; mostrando escenario basico"
        make("Part",{Name="FallbackFloor",Size=Vector3.new(300,2,300),Position=Vector3.new(0,-3,0),Anchored=true,Color=Color3.fromRGB(35,39,49),Material=Enum.Material.Slate},world)
        return
    end
    local clone=map:Clone()
    for _,obj in ipairs(clone:GetDescendants()) do
        if obj:IsA("BasePart") then obj.Anchored=true;obj.CanCollide=false end
        if obj:IsA("Script") or obj:IsA("LocalScript") then obj:Destroy() end
    end
    clone.Parent=world
    mapModel=clone
end
local function makeAvatar(id)
    local uid=tonumber(id)
    local ok,model=pcall(function()
        return Players:CreateHumanoidModelFromUserIdAsync(uid)
    end)
    if not ok or not model then
        -- Fallback makes an incomplete replay visibly obvious, never an accurate character.
        model=Instance.new("Model")
        model.Name="AvatarNoDisponible_"..tostring(id)
        local head=make("Part",{Name="Head",Size=Vector3.new(2,1,1),Position=Vector3.zero,Anchored=true,Color=Color3.fromRGB(255,82,110)},model)
        model.PrimaryPart=head
    end
    model.Name="Replay_"..id
    for _,part in ipairs(model:GetDescendants()) do
        if part:IsA("BasePart") then part.Anchored=true;part.CanCollide=false end
        if part:IsA("Script") or part:IsA("LocalScript") then part:Destroy() end
    end
    model.Parent=world
    return model
end
local function findAt(t)
    if #frames==0 then return {} end
    local lo,hi=1,#frames
    while lo<hi do
        local mid=math.floor((lo+hi+1)/2)
        if frames[mid][1]<=t then lo=mid else hi=mid-1 end
    end
    local a=frames[lo]
    local b=frames[math.min(lo+1,#frames)]
    local alpha=a[1]==b[1] and 0 or math.clamp((t-a[1])/(b[1]-a[1]),0,1)
    local nextById={}
    for _,p in ipairs(b[2]) do nextById[tostring(p[1])]=p end
    local output={}
    for _,p in ipairs(a[2]) do
        local id=tostring(p[1])
        local q=nextById[id]
        local x,y,z,yaw=p[2],p[3],p[4],p[5]
        if q then
            x+=((q[2] or x)-x)*alpha
            y+=((q[3] or y)-y)*alpha
            z+=((q[4] or z)-z)*alpha
            local delta=(((q[5] or yaw)-yaw+180)%360)-180
            yaw+=delta*alpha
        end
        output[id]={position=Vector3.new(x,y,z),yaw=yaw}
    end
    return output
end
local function startReplay(matchId)
    if loading then return end
    loading=true
    open.Text="CARGANDO..."
    local ok,result=pcall(function() return bridge:InvokeServer("meta",matchId) end)
    if not ok or not result or not result.ok then
        hint.Text="Error: "..tostring(result and result.error or "conexion")
        open.Text="ABRIR PARTIDA";loading=false;return
    end
    if result.data.complete~=true then
        hint.Text="Grabacion parcial: espera a que se sincronicen todos los fragmentos"
        open.Text="ABRIR PARTIDA";loading=false;return
    end
    local meta=result.data
    if meta.totalChunks<1 or meta.totalChunks>50 then
        hint.Text="Cantidad de fragmentos invalida";open.Text="ABRIR PARTIDA";loading=false;return
    end
    local loaded={}
    for i=0,meta.totalChunks-1 do
        local packet=nil
        for attempt=1,3 do
            task.wait(.2*attempt)
            local success,response=pcall(function()return bridge:InvokeServer("chunk",matchId,i)end)
            if success and response and response.ok then packet=response.data;break end
        end
        if not packet or typeof(packet.frames)~="table" then
            hint.Text="Error descargando fragmento "..tostring(i)
            open.Text="ABRIR PARTIDA";loading=false;return
        end
        for _,frame in ipairs(packet.frames) do table.insert(loaded,frame) end
    end
    local loadedEvents={}
    local eventCount=math.clamp(tonumber(meta.eventChunks) or 0,0,50)
    for i=0,eventCount-1 do
        local packet
        for attempt=1,3 do
            task.wait(.2*attempt)
            local success,response=pcall(function()return bridge:InvokeServer("events",matchId,i)end)
            if success and response and response.ok then packet=response.data;break end
        end
        if packet and typeof(packet.events)=="table" then
            for _,event in ipairs(packet.events) do table.insert(loadedEvents,event) end
        else
            warn("[PESADILLA Replay V2] Faltan eventos de la partida",matchId,i)
        end
    end
    table.sort(loadedEvents,function(a,b)return a[1]<b[1]end)
    table.sort(loaded,function(a,b)return a[1]<b[1]end)
    local unique={}
    for _,frame in ipairs(loaded) do
        for _,p in ipairs(frame[2]) do unique[tostring(p[1])]=true end
    end
    clearStage()
    setupMap()
    for id in pairs(unique) do
        table.insert(ids,id)
        objects[id]=makeAvatar(id)
    end
    table.sort(ids)
    frames=loaded
    events=loadedEvents
    duration=math.max(.01,tonumber(meta.duration) or 0)
    current=0
    cameraIndex=0
    playing=true
    play.Text="Ⅱ PAUSA"
    panel.Visible=false
    shell.Visible=true
    loading=false
    open.Text="ABRIR PARTIDA"
    message.Text="Partida "..matchId.."  |  "..#frames.." muestras  |  F8 abre el selector"
    print("[PESADILLA Replay V2] Replay cargado",matchId,#frames,"frames")
end
open.Activated:Connect(function()
    local id=idBox.Text:gsub("^%s+",""):gsub("%s+$","")
    if #id==0 then hint.Text="Introduce un ID de partida" return end
    task.spawn(startReplay,id)
end)
local function close()
    playing=false
    shell.Visible=false
    panel.Visible=false
    clearStage()
    table.clear(frames)
    table.clear(events)
end
exit.Activated:Connect(close)
play.Activated:Connect(function()
    if current>=duration then current=0 end
    playing=not playing
    play.Text=playing and "Ⅱ PAUSA" or "▶ PLAY"
end)
follow.Activated:Connect(function()
    cameraIndex=(cameraIndex+1)%(#ids+1)
    follow.Text=cameraIndex==0 and "CAMARA LIBRE" or "SIGUIENDO "..ids[cameraIndex]
end)
speedButton.Activated:Connect(function()
    if speed==1 then speed=2 elseif speed==2 then speed=4 elseif speed==4 then speed=.5 else speed=1 end
    speedButton.Text=tostring(speed).."x"
end)
track.InputBegan:Connect(function(input)
    if input.UserInputType==Enum.UserInputType.MouseButton1 or input.UserInputType==Enum.UserInputType.Touch then
        local percentage=math.clamp((input.Position.X-track.AbsolutePosition.X)/math.max(1,track.AbsoluteSize.X),0,1)
        current=percentage*duration
    end
end)
viewport.InputBegan:Connect(function(input)
    if input.UserInputType==Enum.UserInputType.MouseButton2 or input.UserInputType==Enum.UserInputType.Touch then
        dragging=true
        lastPointer=Vector2.new(input.Position.X,input.Position.Y)
    end
end)
viewport.InputChanged:Connect(function(input)
    if dragging and (input.UserInputType==Enum.UserInputType.MouseMovement or input.UserInputType==Enum.UserInputType.Touch) then
        local pointer=Vector2.new(input.Position.X,input.Position.Y)
        local delta=pointer-lastPointer
        azimuth-=delta.X*.009
        elevation=math.clamp(elevation+delta.Y*.008,math.rad(-10),math.rad(80))
        lastPointer=pointer
    elseif input.UserInputType==Enum.UserInputType.MouseWheel then
        distance=math.clamp(distance-input.Position.Z*3,6,100)
    end
end)
UserInputService.InputEnded:Connect(function(input)
    if input.UserInputType==Enum.UserInputType.MouseButton2 or input.UserInputType==Enum.UserInputType.Touch then dragging=false end
end)
UserInputService.InputBegan:Connect(function(input,gp)
    if gp then return end
    if input.KeyCode==Enum.KeyCode.F8 then panel.Visible=not panel.Visible end
end)

RunService.RenderStepped:Connect(function(dt)
    if not shell.Visible or #frames==0 then return end
    if playing then
        current=math.min(duration,current+dt*speed)
        if current>=duration then playing=false;play.Text="▶ PLAY" end
    end
    local poses=findAt(current)
    local center=Vector3.zero
    local count=0
    for id,model in pairs(objects) do
        local pose=poses[id]
        if pose then
            model:PivotTo(CFrame.new(pose.position)*CFrame.Angles(0,math.rad(pose.yaw),0))
            center+=pose.position
            count+=1
            -- Hide players absent from a snapshot rather than inventing their location.
            for _,desc in ipairs(model:GetDescendants()) do
                if desc:IsA("BasePart") then desc.Transparency=0 end
            end
        else
            for _,desc in ipairs(model:GetDescendants()) do
                if desc:IsA("BasePart") then desc.Transparency=1 end
            end
        end
    end
    if count>0 then center/=count end
    local target=center
    if cameraIndex>0 and ids[cameraIndex] and poses[ids[cameraIndex]] then
        target=poses[ids[cameraIndex]].position+Vector3.new(0,3,0)
    end
    local offset=Vector3.new(math.sin(azimuth)*math.cos(elevation),math.sin(elevation),math.cos(azimuth)*math.cos(elevation))*distance
    camera.CFrame=CFrame.lookAt(target+offset,target)
    local recent=nil
    for i=#events,1,-1 do
        local event=events[i]
        if event[1]<=current and current-event[1]<1.2 then
            recent=event
            break
        end
    end
    if recent then
        local labels={fire="DISPARO",hit="IMPACTO",kill="ELIMINACION",jump="SALTO",equip="ARMA",round="RONDA",ability="HABILIDAD",respawn="REAPARICION",death="MUERTE"}
        eventText.Text=(labels[recent[2]] or recent[2]).."  ·  "..tostring(recent[3]).."  "..tostring(recent[8] or "")
    else
        eventText.Text=""
    end
    stamp.Text=timeText(current).." / "..timeText(duration)
    fill.Size=UDim2.fromScale(current/math.max(duration,.01),1)
end)
print("[PESADILLA Replay V2] Presiona F8 para abrir el visor privado")

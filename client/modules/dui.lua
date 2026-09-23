local store = require 'client.modules.store'
local config = require 'client.modules.config'
local utils = require 'client.modules.utils'

local dui = {}
local controlsRunning = false
local lastInteractKey
dui.anchorX = 0.07
dui.anchorY = 0.5

function dui.register()
    if dui.instance then
        dui.instance:remove()
    end

    lastInteractKey = nil

    local screenW, screenH = GetActualScreenResolution()
    local spriteScale = config.duiScale or 0.12
    local superSample = 2
    local aspect = 2.4
    local height = math.max(2, math.floor(screenH * spriteScale * superSample + 0.5))
    local width = math.max(2, math.floor(height * aspect + 0.5))
    width = width - (width % 2)
    height = height - (height % 2)

    local maxEdge = config.duiResolution or 2048
    local longEdge = math.max(width, height)
    if longEdge > maxEdge then
        local fit = maxEdge / longEdge
        width = math.max(2, math.floor(width * fit + 0.5))
        height = math.max(2, math.floor(height * fit + 0.5))
        width = width - (width % 2)
        height = height - (height % 2)
    end

    dui.width = width
    dui.height = height

    dui.instance = lib.dui:new(
        {
            url = ("nui://%s/web/dist/index.html?surface=dui"):format(cache.resource),
            width = width,
            height = height,
        }
    )

    while not dui.loaded do Wait(100) end

    dui.sendMessage('visible', false)
    dui.sendMessage('setTheme', config.theme or 'modern')
    if config.themeColor then
        dui.sendMessage('setColor', config.themeColor)
    end
    dui.sendMessage('setMenu', {
        compact = config.compactOptions ~= false,
        idleMs = config.compactIdleMs or 2500,
    })
    dui.syncLocales()
end

function dui.syncInteractKey()
    if not dui.instance then return end

    local key = utils.toHumanKeybind('+interact_action')
    if key == lastInteractKey then return end
    lastInteractKey = key

    dui.instance:sendMessage({
        action = 'setKey',
        value = key,
    })
end

function dui.syncLocales()
    if not dui.instance then return end

    dui.instance:sendMessage({
        action = 'setLabel',
        value = locale('interact'),
    })
end

AddEventHandler('ox_lib:setLocale', function()
    dui.syncLocales()
end)

RegisterNuiCallback('load', function(data, cb)
    if type(data) == 'table' and data.surface == 'cursor' then
        cb(1)
        return
    end

    dui.loaded = true
    Wait(1000)
    cb(1)
end)

RegisterNuiCallback('currentOption', function(data, cb)
    store.current.index = data[1]
    cb(1)
end)

RegisterNuiCallback('promptAnchor', function(data, cb)
    if type(data) == 'table' then
        if type(data.x) == 'number' then
            dui.anchorX = data.x
        end
        if type(data.y) == 'number' then
            dui.anchorY = data.y
        end
    end
    cb(1)
end)

dui.cursor = false
dui.keyFocus = false
dui.ownsFocus = false
dui.ignoreHotkeyUntil = 0

function dui.holdHotkey(key)
    dui.ignoreHotkey = type(key) == 'string' and key:upper() or nil
    dui.ignoreHotkeyUntil = GetGameTimer() + 400
end

function dui.releaseHotkey()
    dui.ignoreHotkeyUntil = GetGameTimer() + 100
end
dui.lastOptions = nil
dui.lastKey = nil
dui.lastLabel = nil

local cursorToken = 0
local blocking = false

local function mirror(action, value)
    pcall(SendNUIMessage, {
        action = action,
        value = value,
    })
end

local function blockControls()
    if blocking then return end
    blocking = true
    CreateThread(function()
        while dui.cursor or dui.keyFocus do
            DisableAllControlActions(0)
            DisableAllControlActions(1)
            DisableAllControlActions(2)
            Wait(0)
        end
        blocking = false
    end)
end

function dui.applyFocus()
    local focused = dui.cursor or dui.keyFocus
    if focused then
        SetNuiFocus(true, dui.cursor == true)
        SetNuiFocusKeepInput(false)
        dui.ownsFocus = true
        blockControls()
        return
    end

    if not dui.ownsFocus then return end
    dui.ownsFocus = false
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
end

function dui.setCursor(on)
    on = on == true
    if on == dui.cursor then return end
    if on and not next(store.current) then return end

    dui.cursor = on
    cursorToken = cursorToken + 1
    local token = cursorToken
    dui.applyFocus()

    if not on then
        mirror('cursor', false)
        return
    end

    if dui.lastOptions then
        mirror('setOptions', dui.lastOptions)
    end
    if dui.lastKey then
        mirror('setKey', dui.lastKey)
    end
    if dui.lastLabel then
        mirror('setLabel', dui.lastLabel)
    end
    mirror('visible', true)
    mirror('openMenu')
    if dui.instance then
        dui.instance:sendMessage({ action = 'openMenu' })
    end
    mirror('cursor', {
        scale = (config.duiScale or 0.2) * 7.4,
        x = 0.5,
        y = 0.5,
    })

    CreateThread(function()
        while dui.cursor and token == cursorToken do
            if not next(store.current) or not store.current.coords then
                dui.setCursor(false)
                return
            end

            local coords = store.current.coords
            local visible, sx, sy = GetScreenCoordFromWorldCoord(coords.x, coords.y, coords.z)
            if visible then
                mirror('cursorMove', { x = sx, y = sy })
            end

            Wait(0)
        end
    end)
end

RegisterNuiCallback('releaseCursor', function(_, cb)
    dui.setCursor(false)
    cb(1)
end)

RegisterNuiCallback('holdCursor', function(_, cb)
    dui.setCursor(true)
    cb(1)
end)

RegisterNuiCallback('keyFocus', function(data, cb)
    dui.keyFocus = type(data) == 'table' and data.open == true
    dui.applyFocus()
    cb(1)
end)

RegisterNuiCallback('hotkey', function(data, cb)
    if type(data) == 'table' and type(data.key) == 'string' then
        if data.down == true and dui.ignoreHotkey and GetGameTimer() < (dui.ignoreHotkeyUntil or 0)
            and data.key:upper() == dui.ignoreHotkey then
            cb(1)
            return
        end
        dui.sendMessage('hotkey', {
            key = data.key,
            down = data.down == true,
            cursor = dui.cursor == true,
        })
    end
    cb(1)
end)

RegisterNuiCallback('scroll', function(data, cb)
    local delta = type(data) == 'table' and tonumber(data.delta) or 0
    if delta ~= 0 then
        dui.sendMessage('scroll', {
            delta = delta,
            cursor = dui.cursor == true,
        })
    end
    cb(1)
end)

AddEventHandler('onResourceStop', function(resource)
    if resource ~= cache.resource then return end
    dui.keyFocus = false
    dui.cursor = false
    dui.ownsFocus = false
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
end)

function dui.sendMessage(action, value)
    if action == 'setOptions' then
        dui.lastOptions = value
    elseif action == 'setKey' then
        dui.lastKey = value
    elseif action == 'setLabel' then
        dui.lastLabel = value
    end

    dui.instance:sendMessage({
        action = action,
        value = value
    })

    mirror(action, value)

    if action == 'setOptions' then
        dui.syncInteractKey()
    end

    if action == 'setOptions' and not controlsRunning then
        if controlsRunning then return end
        controlsRunning = true
        CreateThread(function()
            while next(store.current) do
                dui.handleDuiControls()
                Wait(0)
            end
            controlsRunning = false
        end)
    end
end

local IsControlJustPressed = IsControlJustPressed
local SendDuiMouseWheel = SendDuiMouseWheel

dui.handleDuiControls = function()
    if not dui.instance?.duiObject then return end

    local input = false

    if (IsControlJustPressed(3, 180)) then -- SCROLL DOWN
        SendDuiMouseWheel(dui.instance.duiObject, -50, 0.0)
        input = true
    end

    if (IsControlJustPressed(3, 181)) then -- SCROLL UP
        SendDuiMouseWheel(dui.instance.duiObject, 50, 0.0)
        input = true
    end

    if (IsControlJustPressed(3, 173)) then -- ARROW DOWN
        SendDuiMouseWheel(dui.instance.duiObject, -50, 0.0)
        input = true
    end

    if (IsControlJustPressed(3, 172)) then -- ARROW UP
        SendDuiMouseWheel(dui.instance.duiObject, 50, 0.0)
        input = true
    end

    if input then
        Wait(110)
    end
end

dui.register() --- on load and on resource start?

return dui

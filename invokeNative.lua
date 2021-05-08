function CellFrontCamActivate(activate)
    local ret = Citizen.InvokeNative(0x2491A93618B7D838, activate)
	return ret
end
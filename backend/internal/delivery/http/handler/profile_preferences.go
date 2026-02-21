package handler

import "encoding/json"

type ownerPreferences map[string]any

type sidebarMenus map[string]bool

func getAISkillFromPreferences(preferencesJSON []byte) string {
	prefs, _ := parseOwnerPreferences(preferencesJSON)
	if prefs == nil {
		return ""
	}
	if v, ok := prefs["ai_skill"]; ok {
		s, _ := v.(string)
		return s
	}
	return ""
}

func setAISkillInPreferences(preferencesJSON []byte, aiSkill string) ([]byte, error) {
	prefs, err := parseOwnerPreferences(preferencesJSON)
	if err != nil {
		return nil, err
	}
	if prefs == nil {
		prefs = ownerPreferences{}
	}
	prefs["ai_skill"] = aiSkill
	return json.Marshal(prefs)
}

func getSidebarMenusFromPreferences(preferencesJSON []byte) map[string]bool {
	prefs, _ := parseOwnerPreferences(preferencesJSON)
	if prefs == nil {
		return nil
	}
	v, ok := prefs["sidebar_menus"]
	if !ok {
		return nil
	}

	// Because we're decoding into map[string]any, JSON objects become map[string]any
	// with bool values.
	obj, ok := v.(map[string]any)
	if !ok || obj == nil {
		return nil
	}

	out := map[string]bool{}
	for k, raw := range obj {
		b, ok := raw.(bool)
		if ok {
			out[k] = b
		}
	}
	return out
}

func getWhatsAppRequiresApprovalFromPreferences(preferencesJSON []byte) bool {
	// Default to requiring approval (safe-by-default).
	prefs, _ := parseOwnerPreferences(preferencesJSON)
	if prefs == nil {
		return true
	}
	if v, ok := prefs["whatsapp_requires_approval"]; ok {
		b, ok := v.(bool)
		if ok {
			return b
		}
	}
	return true
}

func setWhatsAppRequiresApprovalInPreferences(preferencesJSON []byte, requiresApproval bool) ([]byte, error) {
	prefs, err := parseOwnerPreferences(preferencesJSON)
	if err != nil {
		return nil, err
	}
	if prefs == nil {
		prefs = ownerPreferences{}
	}
	prefs["whatsapp_requires_approval"] = requiresApproval
	return json.Marshal(prefs)
}

func setSidebarMenusInPreferences(preferencesJSON []byte, menus map[string]bool) ([]byte, error) {
	prefs, err := parseOwnerPreferences(preferencesJSON)
	if err != nil {
		return nil, err
	}
	if prefs == nil {
		prefs = ownerPreferences{}
	}
	if menus == nil {
		delete(prefs, "sidebar_menus")
		return json.Marshal(prefs)
	}

	// Store as plain JSON object.
	obj := map[string]bool{}
	for k, v := range menus {
		obj[k] = v
	}
	prefs["sidebar_menus"] = obj
	return json.Marshal(prefs)
}

func parseOwnerPreferences(preferencesJSON []byte) (ownerPreferences, error) {
	if len(preferencesJSON) == 0 {
		return ownerPreferences{}, nil
	}
	var prefs ownerPreferences
	if err := json.Unmarshal(preferencesJSON, &prefs); err != nil {
		// If the stored JSON is invalid for any reason, fail open by resetting.
		return ownerPreferences{}, nil
	}
	if prefs == nil {
		prefs = ownerPreferences{}
	}
	return prefs, nil
}

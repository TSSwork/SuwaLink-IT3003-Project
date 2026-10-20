package com.suwalink.service;

import com.suwalink.dto.request.UpdatePreferencesRequest;
import com.suwalink.entity.User;

public interface UserService {

    void updatePreferences(User user, UpdatePreferencesRequest request);
}

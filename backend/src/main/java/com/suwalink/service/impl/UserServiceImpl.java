package com.suwalink.service.impl;

import com.suwalink.dto.request.UpdatePreferencesRequest;
import com.suwalink.entity.User;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public void updatePreferences(User user, UpdatePreferencesRequest request) {
        user.setPreferredLanguage(request.getPreferredLanguage());
        user.setDistrict(request.getDistrict());
        userRepository.save(user);
    }
}

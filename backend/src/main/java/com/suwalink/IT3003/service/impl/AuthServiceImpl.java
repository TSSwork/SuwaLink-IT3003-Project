package com.suwalink.IT3003.service.impl;

import com.suwalink.IT3003.dto.request.CustomerRegisterRequest;
import com.suwalink.IT3003.dto.request.PharmacyRegisterRequest;
import com.suwalink.IT3003.dto.response.AuthResponse;
import com.suwalink.IT3003.entity.Pharmacy;
import com.suwalink.IT3003.entity.Role;
import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.exception.EmailAlreadyExistsException;
import com.suwalink.IT3003.repository.PharmacyRepository;
import com.suwalink.IT3003.repository.UserRepository;
import com.suwalink.IT3003.security.JwtService;
import com.suwalink.IT3003.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PharmacyRepository pharmacyRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Override
    @Transactional
    public AuthResponse registerCustomer(CustomerRegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        User user = User.builder()
            .name(request.getName())
            .email(request.getEmail())
            .phone(request.getPhone())
            .password(passwordEncoder.encode(request.getPassword()))
            .role(Role.CUSTOMER)
            .build();

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(saved.getId(), saved.getEmail(), saved.getRole());

        return AuthResponse.builder()
            .token(token)
            .role(saved.getRole())
            .id(saved.getId())
            .name(saved.getName())
            .build();
    }

    @Override
    @Transactional
    public void registerPharmacy(PharmacyRegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(request.getEmail());
        }

        User user = User.builder()
            .name(request.getName())
            .email(request.getEmail())
            .phone(request.getPhone())
            .password(passwordEncoder.encode(request.getPassword()))
            .role(Role.PHARMACY_ADMIN)
            .build();

        User savedUser = userRepository.save(user);

        Pharmacy pharmacy = Pharmacy.builder()
            .licenceNo(request.getLicenceNo())
            .address(request.getAddress())
            .verified(false)
            .user(savedUser)
            .build();

        pharmacyRepository.save(pharmacy);
    }
}

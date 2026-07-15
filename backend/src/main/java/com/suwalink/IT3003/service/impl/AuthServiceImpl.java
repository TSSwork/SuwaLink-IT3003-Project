package com.suwalink.IT3003.service.impl;

import com.suwalink.IT3003.dto.request.CustomerRegisterRequest;
import com.suwalink.IT3003.dto.request.LoginRequest;
import com.suwalink.IT3003.dto.request.PharmacyRegisterRequest;
import com.suwalink.IT3003.dto.response.AuthResponse;
import com.suwalink.IT3003.entity.Pharmacy;
import com.suwalink.IT3003.entity.Role;
import com.suwalink.IT3003.entity.User;
import com.suwalink.IT3003.exception.EmailAlreadyExistsException;
import com.suwalink.IT3003.exception.PharmacyNotVerifiedException;
import com.suwalink.IT3003.repository.PharmacyRepository;
import com.suwalink.IT3003.repository.UserRepository;
import com.suwalink.IT3003.security.JwtService;
import com.suwalink.IT3003.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
    private final AuthenticationManager authenticationManager;

    @Override
    @Transactional
    public AuthResponse registerCustomer(CustomerRegisterRequest request) {
        User saved = registerUser(
            request.getName(), request.getEmail(), request.getPhone(), request.getPassword(), Role.CUSTOMER);

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
        User savedUser = registerUser(
            request.getName(), request.getEmail(), request.getPhone(), request.getPassword(), Role.PHARMACY_ADMIN);

        Pharmacy pharmacy = Pharmacy.builder()
            .licenceNo(request.getLicenceNo())
            .address(request.getAddress())
            .verified(false)
            .user(savedUser)
            .build();

        pharmacyRepository.save(pharmacy);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (user.getRole() == Role.PHARMACY_ADMIN) {
            Pharmacy pharmacy = pharmacyRepository.findByUserId(user.getId())
                .orElseThrow(() -> new IllegalStateException("Pharmacy admin missing pharmacy record"));
            if (!pharmacy.isVerified()) {
                throw new PharmacyNotVerifiedException();
            }
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());

        return AuthResponse.builder()
            .token(token)
            .role(user.getRole())
            .id(user.getId())
            .name(user.getName())
            .build();
    }

    private User registerUser(String name, String email, String phone, String rawPassword, Role role) {
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException(email);
        }

        User user = User.builder()
            .name(name)
            .email(email)
            .phone(phone)
            .password(passwordEncoder.encode(rawPassword))
            .role(role)
            .build();

        return userRepository.save(user);
    }
}

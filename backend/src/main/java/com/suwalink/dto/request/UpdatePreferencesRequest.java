package com.suwalink.dto.request;

import com.suwalink.entity.District;
import com.suwalink.entity.Language;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdatePreferencesRequest {

    @NotNull(message = "Preferred language is required")
    private Language preferredLanguage;

    private District district;
}

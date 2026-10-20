package com.suwalink.service;

import com.suwalink.dto.request.MedicineMasterRequest;
import com.suwalink.dto.response.MedicineMasterResponse;
import com.suwalink.entity.MedicineStatus;
import java.util.List;
import java.util.UUID;

public interface MedicineSuggestionService {

    /** The current pharmacy suggests a new medicine (stored PENDING). 409 if it already exists. */
    MedicineMasterResponse suggest(MedicineMasterRequest request);

    List<MedicineMasterResponse> mySuggestions();

    /** Suggestions by status; null lists pharmacy-suggested medicines of every status. */
    List<MedicineMasterResponse> listSuggestions(MedicineStatus status);

    MedicineMasterResponse approve(UUID id);

    MedicineMasterResponse reject(UUID id, String reason);
}

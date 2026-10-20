package com.suwalink.exception;

import com.suwalink.entity.TargetScope;

/** No publicly visible pharmacy matches the chosen target scope, so the request is not created. */
public class NoPharmaciesInScopeException extends RuntimeException {

    public NoPharmaciesInScopeException(TargetScope scope) {
        super(messageFor(scope));
    }

    private static String messageFor(TargetScope scope) {
        return switch (scope) {
            case RADIUS_10KM -> "No pharmacies within 10 km. Try 'My district' or 'All pharmacies'.";
            case DISTRICT -> "No pharmacies in your district. Try 'All pharmacies'.";
            case ALL -> "No pharmacies are available right now.";
        };
    }
}

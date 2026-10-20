package com.suwalink.service;

import com.suwalink.dto.response.DemoAccountResponse;
import java.util.List;

/**
 * The resettable demo dataset: demo pharmacies with stock, demo customers, and one customer's
 * prescription request, response and reservations. Written directly through repositories, so no
 * notifications or emails are produced. Only rows owned by demo accounts are ever changed.
 */
public interface DemoDataService {

    /** Creates the demo dataset unless a demo pharmacy already exists. */
    void seedIfMissing();

    /** Deletes every demo-owned row (see {@link #deleteDemoData()}) and seeds a fresh dataset. */
    void reset();

    /**
     * Deletes all demo-owned data: reservations of demo customers or at demo pharmacies, responses,
     * requests with their images, bookmarks, notifications, demo inventory, demo pharmacies and demo
     * users. Stock held by a demo customer's confirmed reservation at a real pharmacy is restored.
     */
    void deleteDemoData();

    /** The one-click login accounts shown on the login page; empty while demo mode is off. */
    List<DemoAccountResponse> loginAccounts();
}

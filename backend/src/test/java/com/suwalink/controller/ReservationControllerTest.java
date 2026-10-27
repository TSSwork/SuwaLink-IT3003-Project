package com.suwalink.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.suwalink.entity.Category;
import com.suwalink.entity.Currency;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Notification;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.UnitOfMeasure;
import com.suwalink.entity.User;
import com.suwalink.repository.CategoryRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionRequestRepository;
import com.suwalink.repository.PrescriptionResponseRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.ReservationService;
import com.suwalink.support.TestPayloads;
import jakarta.persistence.EntityManager;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PharmacyRepository pharmacyRepository;

    @Autowired
    private ManufacturerRepository manufacturerRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private MedicineMasterRepository medicineMasterRepository;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private PrescriptionResponseRepository prescriptionResponseRepository;

    @Autowired
    private PrescriptionRequestRepository prescriptionRequestRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EntityManager entityManager;

    // --- create ---------------------------------------------------------------------------------

    @Test
    void reservesSeveralItemsFromOnePharmacy() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.multi.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.multi.pharmacy@example.com", "LIC-RM-1");
        UUID first = createInventoryItem("resv.multi.pharmacy@example.com", new BigDecimal("100.00"), 10);
        UUID second = createInventoryItem("resv.multi.pharmacy@example.com", new BigDecimal("25.50"), 4);

        MvcResult result = reserve(patientToken, line(first, 3), line(second, 2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.total").value(351.00))
                .andExpect(jsonPath("$.data.requiresPrescription").value(false))
                .andExpect(jsonPath("$.data.pickupCode", matchesPattern("^[A-HJ-NP-Z2-9]{10}$")))
                .andExpect(jsonPath("$.data.pharmacy.name").exists())
                .andExpect(jsonPath("$.data.customer.name").value("Test Customer"))
                .andExpect(jsonPath("$.data.items[0].medicineName").value("Panadol 500mg"))
                .andReturn();

        LocalDateTime expiresAt = LocalDateTime.parse(
                JsonPath.read(result.getResponse().getContentAsString(), "$.data.expiresAt"));
        assertThat(Duration.between(LocalDateTime.now().plusHours(24), expiresAt).abs())
                .isLessThan(Duration.ofMinutes(1));

        assertThat(inventoryRepository.findById(first).orElseThrow().getStockQuantity()).isEqualTo(7);
        assertThat(inventoryRepository.findById(second).orElseThrow().getStockQuantity()).isEqualTo(2);
    }

    @Test
    void pharmacySummaryIncludesOpeningHours() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.hours.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.hours.pharmacy@example.com", "LIC-RH-1");
        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
                .filter(p -> p.getUser().getEmail().equals("resv.hours.pharmacy@example.com"))
                .findFirst()
                .orElseThrow();
        pharmacy.setOpeningHours("Mon-Sat 8.00 am - 9.00 pm");
        pharmacyRepository.save(pharmacy);
        UUID item = createInventoryItem("resv.hours.pharmacy@example.com", new BigDecimal("10.00"), 5);

        reserve(patientToken, line(item, 1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.pharmacy.openingHours").value("Mon-Sat 8.00 am - 9.00 pm"));
    }

    @Test
    void rejectsItemsFromTwoPharmacies() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.two.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.two.pharmacyA@example.com", "LIC-RT-1");
        registerVerifiedPharmacyAndLogin("resv.two.pharmacyB@example.com", "LIC-RT-2");
        UUID a = createInventoryItem("resv.two.pharmacyA@example.com", new BigDecimal("10.00"), 5);
        UUID b = createInventoryItem("resv.two.pharmacyB@example.com", new BigDecimal("10.00"), 5);

        reserve(patientToken, line(a, 1), line(b, 1))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("All items in one reservation must come from the same pharmacy"));
    }

    @Test
    void rejectsDuplicateLines() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.dup.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.dup.pharmacy@example.com", "LIC-RD-1");
        UUID item = createInventoryItem("resv.dup.pharmacy@example.com", new BigDecimal("10.00"), 5);

        reserve(patientToken, line(item, 1), line(item, 2)).andExpect(status().isBadRequest());
        assertThat(inventoryRepository.findById(item).orElseThrow().getStockQuantity()).isEqualTo(5);
    }

    @Test
    void rejectsInsufficientStockAndChangesNothing() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.stock.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.stock.pharmacy@example.com", "LIC-RS-1");
        UUID first = createInventoryItem("resv.stock.pharmacy@example.com", new BigDecimal("10.00"), 5);
        UUID second = createInventoryItem("resv.stock.pharmacy@example.com", new BigDecimal("10.00"), 2);

        reserve(patientToken, line(first, 1), line(second, 3)).andExpect(status().isConflict());

        assertThat(inventoryRepository.findById(first).orElseThrow().getStockQuantity()).isEqualTo(5);
        assertThat(inventoryRepository.findById(second).orElseThrow().getStockQuantity()).isEqualTo(2);
    }

    @Test
    void rejectsExpiredOrUnavailableItem() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.exp.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.exp.pharmacy@example.com", "LIC-RE-1");
        UUID expired = createInventoryItem("resv.exp.pharmacy@example.com", new BigDecimal("10.00"), 5);
        Inventory expiredItem = inventoryRepository.findById(expired).orElseThrow();
        expiredItem.setExpireDate(LocalDate.now());
        inventoryRepository.save(expiredItem);
        UUID unavailable = createInventoryItem("resv.exp.pharmacy@example.com", new BigDecimal("10.00"), 5);
        Inventory unavailableItem = inventoryRepository.findById(unavailable).orElseThrow();
        unavailableItem.setAvailable(false);
        inventoryRepository.save(unavailableItem);

        reserve(patientToken, line(expired, 1)).andExpect(status().isConflict());
        reserve(patientToken, line(unavailable, 1)).andExpect(status().isConflict());
    }

    @Test
    void rejectsHiddenPharmacy() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.hidden.patient@example.com");
        mockMvc.perform(post("/api/auth/register/pharmacy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestPayloads.pharmacyRegistration("resv.hidden.pharmacy@example.com", "LIC-RH-1")))
                .andExpect(status().isCreated());
        UUID item = createInventoryItem("resv.hidden.pharmacy@example.com", new BigDecimal("10.00"), 5);

        reserve(patientToken, line(item, 1)).andExpect(status().isNotFound());
        assertThat(inventoryRepository.findById(item).orElseThrow().getStockQuantity()).isEqualTo(5);
    }

    @Test
    void rejectsUnknownInventoryItem() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.unknown.patient@example.com");

        reserve(patientToken, line(UUID.randomUUID(), 1)).andExpect(status().isNotFound());
    }

    @Test
    void requiresPrescriptionFlagFollowsLegalCategory() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.rx.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.rx.pharmacy@example.com", "LIC-RX-1");
        UUID otc = createInventoryItem("resv.rx.pharmacy@example.com", new BigDecimal("10.00"), 5);
        UUID rx = createInventoryItem(
                "resv.rx.pharmacy@example.com", new BigDecimal("10.00"), 5, PrescriptionStatus.PRESCRIPTION);

        reserve(patientToken, line(otc, 1), line(rx, 1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.requiresPrescription").value(true))
                .andExpect(jsonPath("$.data.items[?(@.inventoryItemId == '%s')].requiresPrescription"
                        .formatted(rx)).value(true))
                .andExpect(jsonPath("$.data.items[?(@.inventoryItemId == '%s')].requiresPrescription"
                        .formatted(otc)).value(false));
    }

    @Test
    void reservesFromPrescriptionResponseAtQuotedPrice() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.quote.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.quote.pharmacy@example.com", "LIC-RQ-1");
        UUID item = createInventoryItem("resv.quote.pharmacy@example.com", new BigDecimal("9.50"), 10);
        String requestId = createPrescription(patientToken);
        UUID responseItemId = submitResponse(pharmacyToken, requestId, item, 3);
        Inventory inventory = inventoryRepository.findById(item).orElseThrow();
        inventory.setUnitPrice(new BigDecimal("12.00"));
        inventoryRepository.save(inventory);

        reserve(patientToken, quotedLine(item, 2, responseItemId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.items[0].unitPrice").value(9.50))
                .andExpect(jsonPath("$.data.total").value(19.00))
                .andExpect(jsonPath("$.data.prescriptionRequestId").value(requestId));
    }

    @Test
    void cannotExceedQuotedQuantity() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.qty.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.qty.pharmacy@example.com", "LIC-RQ-2");
        UUID item = createInventoryItem("resv.qty.pharmacy@example.com", new BigDecimal("9.50"), 10);
        String requestId = createPrescription(patientToken);
        UUID responseItemId = submitResponse(pharmacyToken, requestId, item, 3);

        reserve(patientToken, quotedLine(item, 4, responseItemId)).andExpect(status().isBadRequest());
        assertThat(inventoryRepository.findById(item).orElseThrow().getStockQuantity()).isEqualTo(10);
    }

    @Test
    void cannotUseSomeoneElsesResponse() throws Exception {
        String ownerToken = registerCustomerAndLogin("resv.owner.patient@example.com");
        String strangerToken = registerCustomerAndLogin("resv.stranger.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.owner.pharmacy@example.com", "LIC-RQ-3");
        UUID item = createInventoryItem("resv.owner.pharmacy@example.com", new BigDecimal("9.50"), 10);
        String requestId = createPrescription(ownerToken);
        UUID responseItemId = submitResponse(pharmacyToken, requestId, item, 3);

        reserve(strangerToken, quotedLine(item, 1, responseItemId)).andExpect(status().isForbidden());
    }

    @Test
    void strangerQuoteIsForbiddenBeforeStockIsRevealed() throws Exception {
        String ownerToken = registerCustomerAndLogin("resv.order.patient@example.com");
        String strangerToken = registerCustomerAndLogin("resv.order.stranger@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.order.pharmacy@example.com", "LIC-RQ-9");
        UUID item = createInventoryItem("resv.order.pharmacy@example.com", new BigDecimal("9.50"), 3);
        String requestId = createPrescription(ownerToken);
        UUID responseItemId = submitResponse(pharmacyToken, requestId, item, 3);

        // Asks for more than is in stock: without the ordering this would be a 409 naming the stock.
        reserve(strangerToken, quotedLine(item, 50, responseItemId)).andExpect(status().isForbidden());
    }

    @Test
    void moreThanTwentyLinesIsRejected() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.many.patient@example.com");
        String[] lines = new String[21];
        for (int i = 0; i < lines.length; i++) {
            lines[i] = line(UUID.randomUUID(), 1);
        }

        reserve(patientToken, lines).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message").value("A reservation can have at most 20 items"));
    }

    @Test
    void quantityAboveOneHundredIsRejected() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.big.patient@example.com");

        reserve(patientToken, line(UUID.randomUUID(), 101)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].message").value("quantity must be at most 100"));
    }

    // --- existing lifecycle (adapted to the multi-line request) --------------------------------

    @Test
    void cancel_byPatient_restocksInventory() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.patient3@example.com");
        registerVerifiedPharmacyAndLogin("resv.pharmacy3@example.com", "LIC-V-3");
        UUID inventoryId = createInventoryItem("resv.pharmacy3@example.com", new BigDecimal("20.00"), 5);

        String reservationId = createReservation(patientToken, inventoryId, 2);

        mockMvc.perform(patch("/api/reservations/" + reservationId + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + patientToken)
                        .content("{ \"reason\": \"Changed my mind\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        assertThat(inventoryRepository.findById(inventoryId).orElseThrow().getStockQuantity()).isEqualTo(5);

        mockMvc.perform(get("/api/reservations/me").header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].status").value("CANCELLED"));
    }

    @Test
    void cancel_byStranger_isForbidden() throws Exception {
        String owner = registerCustomerAndLogin("resv.patient4@example.com");
        String stranger = registerCustomerAndLogin("resv.patient5@example.com");
        registerVerifiedPharmacyAndLogin("resv.pharmacy4@example.com", "LIC-V-4");
        UUID inventoryId = createInventoryItem("resv.pharmacy4@example.com", new BigDecimal("15.00"), 5);

        String reservationId = createReservation(owner, inventoryId, 1);

        mockMvc.perform(patch("/api/reservations/" + reservationId + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + stranger))
                .andExpect(status().isForbidden());
    }

    @Test
    void complete_byOwningPharmacy_marksCompleted() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.patient6@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.pharmacy5@example.com", "LIC-V-5");
        UUID inventoryId = createInventoryItem("resv.pharmacy5@example.com", new BigDecimal("70.00"), 5);

        String reservationId = createReservation(patientToken, inventoryId, 1);

        mockMvc.perform(patch("/api/reservations/" + reservationId + "/complete")
                        .header("Authorization", "Bearer " + pharmacyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    @Test
    void pharmacyReservations_returnsIncomingReservations() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.patient7@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.pharmacy6@example.com", "LIC-V-6");
        UUID inventoryId = createInventoryItem("resv.pharmacy6@example.com", new BigDecimal("25.00"), 5);

        createReservation(patientToken, inventoryId, 1);

        mockMvc.perform(get("/api/reservations").header("Authorization", "Bearer " + pharmacyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].items[0].quantity").value(1));
    }

    // --- request validation and quoted-line rules -----------------------------------------------

    @Test
    void nullLineIsRejected() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.null.patient@example.com");

        reserve(patientToken, "null").andExpect(status().isBadRequest());
    }

    @Test
    void quotedQuantityIsReducedByWhatIsAlreadyHeld() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.held.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.held.pharmacy@example.com", "LIC-RQ-4");
        UUID item = createInventoryItem("resv.held.pharmacy@example.com", new BigDecimal("9.50"), 10);
        String requestId = createPrescription(patientToken);
        UUID responseItemId = submitResponse(pharmacyToken, requestId, item, 3);

        reserve(patientToken, quotedLine(item, 2, responseItemId)).andExpect(status().isCreated());
        reserve(patientToken, quotedLine(item, 2, responseItemId)).andExpect(status().isBadRequest());
        reserve(patientToken, quotedLine(item, 1, responseItemId)).andExpect(status().isCreated());
        reserve(patientToken, quotedLine(item, 1, responseItemId)).andExpect(status().isBadRequest());
        assertThat(inventoryRepository.findById(item).orElseThrow().getStockQuantity()).isEqualTo(7);
    }

    @Test
    void cancelledReservationNoLongerHoldsQuotedQuantity() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.heldc.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.heldc.pharmacy@example.com", "LIC-RQ-5");
        UUID item = createInventoryItem("resv.heldc.pharmacy@example.com", new BigDecimal("9.50"), 10);
        String requestId = createPrescription(patientToken);
        UUID responseItemId = submitResponse(pharmacyToken, requestId, item, 3);

        String first = JsonPath.read(reserve(patientToken, quotedLine(item, 3, responseItemId))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.data.id");
        cancel(patientToken, first).andExpect(status().isOk());

        reserve(patientToken, quotedLine(item, 3, responseItemId)).andExpect(status().isCreated());
    }

    @Test
    void rejectsQuotedLinesFromTwoPrescriptionRequests() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.tworeq.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.tworeq.pharmacy@example.com", "LIC-RQ-6");
        UUID first = createInventoryItem("resv.tworeq.pharmacy@example.com", new BigDecimal("9.50"), 10);
        UUID second = createInventoryItem("resv.tworeq.pharmacy@example.com", new BigDecimal("4.00"), 10);
        UUID firstQuote = submitResponse(pharmacyToken, createPrescription(patientToken), first, 2);
        UUID secondQuote = submitResponse(pharmacyToken, createPrescription(patientToken), second, 2);

        reserve(patientToken, quotedLine(first, 1, firstQuote), quotedLine(second, 1, secondQuote))
                .andExpect(status().isBadRequest());
        assertThat(inventoryRepository.findById(first).orElseThrow().getStockQuantity()).isEqualTo(10);
        assertThat(inventoryRepository.findById(second).orElseThrow().getStockQuantity()).isEqualTo(10);
    }

    @Test
    void quotesOfExpiredOrClosedRequestCannotBeReserved() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.closedreq.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.closedreq.pharmacy@example.com", "LIC-RQ-7");
        UUID item = createInventoryItem("resv.closedreq.pharmacy@example.com", new BigDecimal("9.50"), 10);

        for (PrescriptionRequestStatus closed : List.of(PrescriptionRequestStatus.EXPIRED, PrescriptionRequestStatus.CLOSED)) {
            String requestId = createPrescription(patientToken);
            UUID responseItemId = submitResponse(pharmacyToken, requestId, item, 2);
            PrescriptionRequest request = prescriptionRequestRepository.findById(UUID.fromString(requestId)).orElseThrow();
            request.setStatus(closed);
            prescriptionRequestRepository.save(request);

            reserve(patientToken, quotedLine(item, 1, responseItemId)).andExpect(status().isConflict());
        }
        assertThat(inventoryRepository.findById(item).orElseThrow().getStockQuantity()).isEqualTo(10);
    }

    @Test
    void quotedItemMustMatchLineInventory() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.mismatch.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.mismatch.pharmacy@example.com", "LIC-RQ-8");
        UUID quoted = createInventoryItem("resv.mismatch.pharmacy@example.com", new BigDecimal("9.50"), 10);
        UUID other = createInventoryItem("resv.mismatch.pharmacy@example.com", new BigDecimal("1.00"), 10);
        UUID responseItemId = submitResponse(pharmacyToken, createPrescription(patientToken), quoted, 2);

        reserve(patientToken, quotedLine(other, 1, responseItemId)).andExpect(status().isBadRequest());
    }

    @Test
    void unknownPrescriptionResponseItemIs404() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.unknownq.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.unknownq.pharmacy@example.com", "LIC-RQ-9");
        UUID item = createInventoryItem("resv.unknownq.pharmacy@example.com", new BigDecimal("9.50"), 10);

        reserve(patientToken, quotedLine(item, 1, UUID.randomUUID())).andExpect(status().isNotFound());
    }

    // --- lifecycle: cancel, complete, expiry ----------------------------------------------------

    @Test
    void customerCancelsAndStockReturns() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.cc.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.cc.pharmacy@example.com", "LIC-LC-1");
        UUID first = createInventoryItem("resv.cc.pharmacy@example.com", new BigDecimal("10.00"), 5);
        UUID second = createInventoryItem("resv.cc.pharmacy@example.com", new BigDecimal("10.00"), 3);
        String id = JsonPath.read(reserve(patientToken, line(first, 2), line(second, 3))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.data.id");

        cancel(patientToken, id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancelledBy").value("PATIENT"));

        assertThat(inventoryRepository.findById(first).orElseThrow().getStockQuantity()).isEqualTo(5);
        assertThat(inventoryRepository.findById(second).orElseThrow().getStockQuantity()).isEqualTo(3);
        assertThat(notificationKeys("resv.cc.pharmacy@example.com")).contains("notify.reservation.cancelled-by-customer");
        assertThat(notificationKeys("resv.cc.patient@example.com"))
                .noneMatch(key -> key.startsWith("notify.reservation.cancelled"));
    }

    @Test
    void pharmacyCancelsWithReason() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.pc.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.pc.pharmacy@example.com", "LIC-LC-2");
        UUID item = createInventoryItem("resv.pc.pharmacy@example.com", new BigDecimal("10.00"), 5);
        String id = createReservation(patientToken, item, 2);

        mockMvc.perform(patch("/api/reservations/" + id + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + pharmacyToken)
                        .content("{ \"reason\": \"Out of stock after all\" }"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancelledBy").value("PHARMACY"))
                .andExpect(jsonPath("$.data.cancelReason").value("Out of stock after all"));

        assertThat(inventoryRepository.findById(item).orElseThrow().getStockQuantity()).isEqualTo(5);
        assertThat(notificationKeys("resv.pc.patient@example.com")).contains("notify.reservation.cancelled-by-pharmacy");
    }

    @Test
    void cannotCancelTwice() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.twice.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.twice.pharmacy@example.com", "LIC-LC-3");
        UUID item = createInventoryItem("resv.twice.pharmacy@example.com", new BigDecimal("10.00"), 5);
        String id = createReservation(patientToken, item, 2);

        cancel(patientToken, id).andExpect(status().isOk());
        cancel(patientToken, id).andExpect(status().isConflict());
        assertThat(inventoryRepository.findById(item).orElseThrow().getStockQuantity()).isEqualTo(5);
    }

    @Test
    void pharmacyCompletes() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.comp.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.comp.pharmacy@example.com", "LIC-LC-4");
        UUID item = createInventoryItem("resv.comp.pharmacy@example.com", new BigDecimal("10.00"), 5);
        String id = createReservation(patientToken, item, 2);

        complete(pharmacyToken, id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        assertThat(inventoryRepository.findById(item).orElseThrow().getStockQuantity()).isEqualTo(3);
        assertThat(notificationKeys("resv.comp.patient@example.com")).contains("notify.reservation.completed");
        complete(pharmacyToken, id).andExpect(status().isConflict());
    }

    @Test
    void otherPharmacyCannotComplete() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.ocomp.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.ocomp.pharmacy@example.com", "LIC-LC-5");
        String otherToken = registerVerifiedPharmacyAndLogin("resv.ocomp.other@example.com", "LIC-LC-6");
        UUID item = createInventoryItem("resv.ocomp.pharmacy@example.com", new BigDecimal("10.00"), 5);
        String id = createReservation(patientToken, item, 1);

        complete(otherToken, id).andExpect(status().isForbidden());
    }

    @Test
    void cannotCompleteExpiredHold() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.cexp.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.cexp.pharmacy@example.com", "LIC-LC-7");
        UUID item = createInventoryItem("resv.cexp.pharmacy@example.com", new BigDecimal("10.00"), 5);
        String id = createReservation(patientToken, item, 1);
        expireHold(id);

        complete(pharmacyToken, id)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This reservation has expired"));
    }

    // --- lookup by id and pickup code -----------------------------------------------------------

    @Test
    void ownerAndPharmacyCanOpenByPickupCode() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.code.patient@example.com");
        String pharmacyToken = registerVerifiedPharmacyAndLogin("resv.code.pharmacy@example.com", "LIC-PC-1");
        UUID item = createInventoryItem("resv.code.pharmacy@example.com", new BigDecimal("10.00"), 5);
        String id = createReservation(patientToken, item, 1);
        String code = reservationRepository.findById(UUID.fromString(id)).orElseThrow().getPickupCode();

        for (String token : List.of(patientToken, pharmacyToken)) {
            mockMvc.perform(get("/api/reservations/by-code/" + code).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.id").value(id))
                    .andExpect(jsonPath("$.data.pickupCode").value(code));
            mockMvc.perform(get("/api/reservations/" + id).header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.id").value(id));
        }
    }

    @Test
    void strangerGets404ByPickupCode() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.scode.patient@example.com");
        String strangerToken = registerCustomerAndLogin("resv.scode.stranger@example.com");
        registerVerifiedPharmacyAndLogin("resv.scode.pharmacy@example.com", "LIC-PC-2");
        String otherPharmacyToken = registerVerifiedPharmacyAndLogin("resv.scode.other@example.com", "LIC-PC-3");
        UUID item = createInventoryItem("resv.scode.pharmacy@example.com", new BigDecimal("10.00"), 5);
        String id = createReservation(patientToken, item, 1);
        String code = reservationRepository.findById(UUID.fromString(id)).orElseThrow().getPickupCode();

        for (String token : List.of(strangerToken, otherPharmacyToken)) {
            mockMvc.perform(get("/api/reservations/by-code/" + code).header("Authorization", "Bearer " + token))
                    .andExpect(status().isNotFound());
            mockMvc.perform(get("/api/reservations/" + id).header("Authorization", "Bearer " + token))
                    .andExpect(status().isNotFound());
        }
    }

    @Test
    void unknownPickupCodeIs404() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.ucode.patient@example.com");

        mockMvc.perform(get("/api/reservations/by-code/ABCDEFGHJK").header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/reservations/" + UUID.randomUUID()).header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminCanOpenAnyReservation() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.admin.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.admin.pharmacy@example.com", "LIC-PC-4");
        UUID item = createInventoryItem("resv.admin.pharmacy@example.com", new BigDecimal("10.00"), 5);
        String id = createReservation(patientToken, item, 1);
        String code = reservationRepository.findById(UUID.fromString(id)).orElseThrow().getPickupCode();
        userRepository.save(User.builder().termsAcceptedAt(java.time.LocalDateTime.now())
                .name("Reservation Admin")
                .email("resv.admin@suwalink.local")
                .phone("0000000000")
                .password(passwordEncoder.encode("SecurePass123"))
                .role(Role.ADMIN)
                .build());
        String adminToken = loginAndGetToken("resv.admin@suwalink.local");

        mockMvc.perform(get("/api/reservations/" + id).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id));
        mockMvc.perform(get("/api/reservations/by-code/" + code).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id));
    }

    @Test
    void listQueriesFetchItemsPharmacyAndCustomer() throws Exception {
        String patientToken = registerCustomerAndLogin("resv.fetch.patient@example.com");
        registerVerifiedPharmacyAndLogin("resv.fetch.pharmacy@example.com", "LIC-PC-5");
        UUID item = createInventoryItem("resv.fetch.pharmacy@example.com", new BigDecimal("10.00"), 5);
        String id = createReservation(patientToken, item, 1);
        Reservation saved = reservationRepository.findById(UUID.fromString(id)).orElseThrow();
        UUID patientId = saved.getPatient().getId();
        UUID pharmacyId = saved.getPharmacy().getId();
        entityManager.flush();
        entityManager.clear();

        for (List<Reservation> list : List.of(
                reservationRepository.findByPatientIdOrderByCreatedAtDesc(patientId),
                reservationRepository.findByPharmacyIdOrderByCreatedAtDesc(pharmacyId))) {
            assertThat(list).hasSize(1);
            Reservation reservation = list.get(0);
            assertThat(Hibernate.isInitialized(reservation.getItems())).isTrue();
            assertThat(Hibernate.isInitialized(reservation.getPharmacy())).isTrue();
            assertThat(Hibernate.isInitialized(reservation.getPatient())).isTrue();
            entityManager.clear();
        }
    }

    // --- helpers ---------------------------------------------------------------------------------

    private static String line(UUID inventoryId, int quantity) {
        return """
            { "inventoryItemId": "%s", "quantity": %d }""".formatted(inventoryId, quantity);
    }

    private static String quotedLine(UUID inventoryId, int quantity, UUID responseItemId) {
        return """
            { "inventoryItemId": "%s", "quantity": %d, "prescriptionResponseItemId": "%s" }"""
                .formatted(inventoryId, quantity, responseItemId);
    }

    private ResultActions reserve(String patientToken, String... lines) throws Exception {
        return mockMvc.perform(post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + patientToken)
                .content("{ \"lines\": [ " + String.join(", ", lines) + " ] }"));
    }

    private ResultActions cancel(String token, String reservationId) throws Exception {
        return mockMvc.perform(patch("/api/reservations/" + reservationId + "/cancel")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + token));
    }

    private ResultActions complete(String token, String reservationId) throws Exception {
        return mockMvc.perform(patch("/api/reservations/" + reservationId + "/complete")
                .header("Authorization", "Bearer " + token));
    }

    private void expireHold(String reservationId) {
        Reservation reservation = reservationRepository.findById(UUID.fromString(reservationId)).orElseThrow();
        reservation.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        reservationRepository.save(reservation);
    }

    private List<String> notificationKeys(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(user).stream()
                .map(Notification::getMessageKey)
                .toList();
    }

    private String createReservation(String patientToken, UUID inventoryId, int quantity) throws Exception {
        MvcResult result = reserve(patientToken, line(inventoryId, quantity))
                .andExpect(status().isCreated())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private String createPrescription(String patientToken) throws Exception {
        BufferedImage image = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        MockMultipartFile file =
                new MockMultipartFile("image", "prescription.png", MediaType.IMAGE_PNG_VALUE, out.toByteArray());

        MvcResult result = mockMvc.perform(multipart("/api/prescriptions")
                        .file(file)
                        .with(TestPayloads.prescriptionTargetAll())
                        .param("patientAge", "30")
                        .header("Authorization", "Bearer " + patientToken))
                .andExpect(status().isCreated())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    /** Submits a one-item response and returns the id of its item. */
    private UUID submitResponse(String pharmacyToken, String requestId, UUID inventoryId, int quantity)
            throws Exception {
        mockMvc.perform(post("/api/prescriptions/" + requestId + "/responses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + pharmacyToken)
                        .content("""
                            { "items": [ { "inventoryItemId": "%s", "quantity": %d } ] }
                            """.formatted(inventoryId, quantity)))
                .andExpect(status().isCreated());

        return prescriptionResponseRepository
                .findByPrescriptionRequestIdOrderByCreatedAtDesc(UUID.fromString(requestId))
                .get(0).getItems().get(0).getId();
    }

    private UUID createInventoryItem(String pharmacyEmail, BigDecimal unitPrice, int stockQuantity) {
        return createInventoryItem(pharmacyEmail, unitPrice, stockQuantity, PrescriptionStatus.OTC);
    }

    private UUID createInventoryItem(
            String pharmacyEmail, BigDecimal unitPrice, int stockQuantity, PrescriptionStatus legalCategory) {
        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
                .filter(p -> p.getUser().getEmail().equals(pharmacyEmail))
                .findFirst()
                .orElseThrow();

        Manufacturer manufacturer = manufacturerRepository.save(Manufacturer.builder()
                .name("Acme-" + UUID.randomUUID())
                .country("Sri Lanka")
                .isActive(true)
                .build());

        Category category = categoryRepository.save(Category.builder()
                .name("Category-" + UUID.randomUUID())
                .active(true)
                .build());

        MedicineMaster medicine = medicineMasterRepository.save(MedicineMaster.builder()
                .brandName("Panadol")
                .genericName("Paracetamol")
                .dosageForm("Tablet")
                .strength("500mg")
                .unitOfMeasure(UnitOfMeasure.TABLET)
                .manufacturer(manufacturer)
                .therapeuticCategory(category)
                .legalCategory(legalCategory)
                .build());

        Inventory inventory = inventoryRepository.save(Inventory.builder()
                .medicineMaster(medicine)
                .pharmacy(pharmacy)
                .unitPrice(unitPrice)
                .currency(Currency.LKR)
                .stockQuantity(stockQuantity)
                .expireDate(LocalDate.now().plusYears(1))
                .available(true)
                .build());

        return inventory.getId();
    }

    private String registerCustomerAndLogin(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register/customer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "name": "Test Customer", "email": "%s", "phone": "0771234567", "password": "SecurePass123", "acceptTerms": true }
                            """.formatted(email)))
                .andExpect(status().isCreated());

        return loginAndGetToken(email);
    }

    private String registerVerifiedPharmacyAndLogin(String email, String licenceNo) throws Exception {
        mockMvc.perform(post("/api/auth/register/pharmacy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TestPayloads.pharmacyRegistration(email, licenceNo)))
                .andExpect(status().isCreated());

        Pharmacy pharmacy = pharmacyRepository.findAll().stream()
                .filter(p -> p.getUser().getEmail().equals(email))
                .findFirst()
                .orElseThrow();
        pharmacy.setStatus(PharmacyStatus.VERIFIED);
        pharmacyRepository.save(pharmacy);

        return loginAndGetToken(email);
    }

    private String loginAndGetToken(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            { "email": "%s", "password": "SecurePass123" }
                            """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.token");
    }
}

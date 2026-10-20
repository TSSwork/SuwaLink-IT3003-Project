package com.suwalink.service.impl;

import com.suwalink.dto.response.DemoAccountResponse;
import com.suwalink.entity.Bookmark;
import com.suwalink.entity.CancelledBy;
import com.suwalink.entity.District;
import com.suwalink.entity.Image;
import com.suwalink.entity.ImageType;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Language;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.MedicineStatus;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionRequest;
import com.suwalink.entity.PrescriptionRequestStatus;
import com.suwalink.entity.PrescriptionResponse;
import com.suwalink.entity.PrescriptionResponseItem;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.Reservation;
import com.suwalink.entity.ReservationItem;
import com.suwalink.entity.ReservationStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.TargetScope;
import com.suwalink.entity.User;
import com.suwalink.exception.FileStorageException;
import com.suwalink.repository.BookmarkRepository;
import com.suwalink.repository.ImageRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.PrescriptionRequestRepository;
import com.suwalink.repository.PrescriptionResponseRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.service.DemoDataService;
import com.suwalink.service.PharmacyVisibilityService;
import com.suwalink.util.PickupCodeGenerator;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Writes the demo dataset straight through repositories: no service calls, so no notification or
 * email events are published. Every delete starts from the {@code is_demo} users and pharmacies.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DemoDataServiceImpl implements DemoDataService {

    static final String DEMO_PASSWORD = "DemoPass123!";
    static final String CUSTOMER_EMAIL = "customer%d@demo.suwalink.lk";
    static final String PHARMACY_EMAIL = "pharmacy%d@demo.suwalink.lk";
    private static final String SAMPLE_PRESCRIPTION = "demo/sample-prescription.webp";
    private static final int MIN_STOCK_LINES = 15;
    private static final int MAX_STOCK_LINES = 30;
    private static final String OPENING_HOURS = "Mon-Sat 8:00-21:00, Sun 9:00-13:00";

    /** Stocked by every demo pharmacy when present in the catalog, so a search for them always finds demo offers. */
    private static final List<String> STAPLE_BRANDS = List.of("Panadol", "Amoxil", "Amoxicillin", "Piriton", "Alerid");

    /** Base retail price in LKR per unit; each pharmacy prices within +/-15 % of it. */
    private static final Map<String, String> BASE_PRICES = Map.ofEntries(
            Map.entry("Panadol", "4.50"), Map.entry("Panadol Extra", "12.00"), Map.entry("Panadol Paediatric", "450.00"),
            Map.entry("Paracetamol", "3.00"), Map.entry("Brufen", "9.00"), Map.entry("Ponstan", "18.00"),
            Map.entry("Diclofenac Sodium", "3.50"), Map.entry("Voltaren Emulgel", "850.00"), Map.entry("Piriton", "4.00"),
            Map.entry("Alerid", "8.00"), Map.entry("Loratadine", "6.00"), Map.entry("Amoxil", "22.00"),
            Map.entry("Augmentin", "120.00"), Map.entry("Amoxicillin", "10.00"), Map.entry("Azee", "95.00"),
            Map.entry("Ciplox", "30.00"), Map.entry("Flagyl", "6.00"), Map.entry("Cephalexin", "18.00"),
            Map.entry("Glucophage", "9.00"), Map.entry("Metformin", "3.00"), Map.entry("Diamicron MR", "45.00"),
            Map.entry("Losartan Potassium", "8.00"), Map.entry("Norvasc", "40.00"), Map.entry("Amlodipine", "4.00"),
            Map.entry("Atenolol", "3.00"), Map.entry("Enalapril", "3.00"), Map.entry("Lipitor", "85.00"),
            Map.entry("Atorvastatin", "12.00"), Map.entry("Rosuvas", "35.00"), Map.entry("Omeprazole", "5.00"),
            Map.entry("Nexium", "110.00"), Map.entry("Motilium", "18.00"), Map.entry("Gaviscon", "950.00"),
            Map.entry("Imodium", "25.00"), Map.entry("Buscopan", "20.00"), Map.entry("Jeewani", "35.00"),
            Map.entry("Ventolin Inhaler", "1150.00"), Map.entry("Seretide Evohaler", "4200.00"),
            Map.entry("Salbutamol Syrup", "120.00"), Map.entry("Montair", "40.00"), Map.entry("Strepsils", "25.00"),
            Map.entry("Cee-Vitt", "6.00"), Map.entry("Limcee", "10.00"), Map.entry("Caltrate", "45.00"),
            Map.entry("Ferrous Sulphate + Folic Acid", "2.00"), Map.entry("Folic Acid", "1.50"),
            Map.entry("Revital H", "60.00"), Map.entry("Betnovate", "450.00"), Map.entry("Canesten", "650.00"),
            Map.entry("Prednisolone", "2.00"));
    private static final BigDecimal DEFAULT_BASE_PRICE = new BigDecimal("25.00");

    private record DemoPharmacy(String name, District district, String city, String address, String phone,
                                String latitude, String longitude, String ownerName, Language language) {
    }

    private record DemoCustomer(String name, String phone, District district, Language language) {
    }

    /** The first two are in Colombo; customer 1's request goes to them. */
    private static final List<DemoPharmacy> PHARMACIES = List.of(
            new DemoPharmacy("Kollupitiya City Pharmacy", District.COLOMBO, "Colombo 03",
                    "212 Galle Road, Kollupitiya, Colombo 03", "0112574321", "6.911500", "79.850300",
                    "Nimal Perera", Language.EN),
            new DemoPharmacy("Nugegoda Family Pharmacy", District.COLOMBO, "Nugegoda",
                    "88 High Level Road, Nugegoda", "0112852467", "6.865100", "79.899500",
                    "Shanika Wijesinghe", Language.SI),
            new DemoPharmacy("Negombo Sea Street Pharmacy", District.GAMPAHA, "Negombo",
                    "45 Main Street, Negombo", "0312234789", "7.208900", "79.837600",
                    "Roshan Fernando", Language.EN),
            new DemoPharmacy("Gampaha Town Pharmacy", District.GAMPAHA, "Gampaha",
                    "120 Colombo Road, Gampaha", "0332227654", "7.091700", "79.999400",
                    "Chamari Gunawardena", Language.SI),
            new DemoPharmacy("Dalada Veediya Pharmacy", District.KANDY, "Kandy",
                    "34 Dalada Veediya, Kandy", "0812223456", "7.293600", "80.640500",
                    "Asanka Bandara", Language.SI),
            new DemoPharmacy("Peradeniya Health Pharmacy", District.KANDY, "Peradeniya",
                    "12 Peradeniya Road, Peradeniya", "0812388912", "7.268100", "80.596400",
                    "Kumaran Selvarajah", Language.TA),
            new DemoPharmacy("Galle Wakwella Pharmacy", District.GALLE, "Galle",
                    "18 Wakwella Road, Galle", "0912245678", "6.041200", "80.215300",
                    "Ishara de Silva", Language.EN));

    private static final List<DemoCustomer> CUSTOMERS = List.of(
            new DemoCustomer("Kasun Jayasinghe", "0771234501", District.COLOMBO, Language.EN),
            new DemoCustomer("Dilini Rathnayake", "0712345602", District.KANDY, Language.SI),
            new DemoCustomer("Priya Shanmugam", "0763456703", District.GALLE, Language.TA));

    private final UserRepository userRepository;
    private final PharmacyRepository pharmacyRepository;
    private final InventoryRepository inventoryRepository;
    private final MedicineMasterRepository medicineMasterRepository;
    private final PrescriptionRequestRepository prescriptionRequestRepository;
    private final PrescriptionResponseRepository prescriptionResponseRepository;
    private final ReservationRepository reservationRepository;
    private final BookmarkRepository bookmarkRepository;
    private final NotificationRepository notificationRepository;
    private final ImageRepository imageRepository;
    private final PasswordEncoder passwordEncoder;
    private final PharmacyVisibilityService visibility;
    private final PickupCodeGenerator pickupCodeGenerator;

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${app.prescription.expiry-days:7}")
    private int requestExpiryDays;

    @Value("${app.reservation.hold-hours:24}")
    private int holdHours;

    @Override
    @Transactional
    public void seedIfMissing() {
        if (pharmacyRepository.existsByDemoTrue()) {
            return;
        }
        seed();
    }

    @Override
    @Transactional
    public void reset() {
        removeDemoData();
        seed();
    }

    @Override
    @Transactional
    public void deleteDemoData() {
        removeDemoData();
    }

    @Override
    public List<DemoAccountResponse> loginAccounts() {
        if (!visibility.isDemoModePublic()) {
            return List.of();
        }
        return List.of(
                new DemoAccountResponse(Role.CUSTOMER, CUSTOMER_EMAIL.formatted(1), DEMO_PASSWORD),
                new DemoAccountResponse(Role.PHARMACY_OWNER, PHARMACY_EMAIL.formatted(1), DEMO_PASSWORD));
    }

    // ---------------------------------------------------------------- seeding

    private void seed() {
        List<MedicineMaster> catalog = medicineMasterRepository.findByStatus(MedicineStatus.APPROVED).stream()
                .sorted(Comparator.comparing(MedicineMaster::getBrandName).thenComparing(MedicineMaster::getStrength))
                .toList();
        if (catalog.size() < 2) {
            log.warn("Demo data not seeded: the medicine catalog has {} approved medicines", catalog.size());
            return;
        }
        String password = passwordEncoder.encode(DEMO_PASSWORD);
        LocalDateTime now = LocalDateTime.now();

        List<Pharmacy> pharmacies = new ArrayList<>();
        Map<Pharmacy, List<Inventory>> stock = new LinkedHashMap<>();
        for (int i = 0; i < PHARMACIES.size(); i++) {
            DemoPharmacy spec = PHARMACIES.get(i);
            User owner = userRepository.save(User.builder()
                    .name(spec.ownerName()).email(PHARMACY_EMAIL.formatted(i + 1)).phone(spec.phone())
                    .password(password).role(Role.PHARMACY_OWNER).preferredLanguage(spec.language())
                    .district(spec.district()).demo(true).termsAcceptedAt(now).build());
            Pharmacy pharmacy = pharmacyRepository.save(Pharmacy.builder()
                    .name(spec.name()).phone(spec.phone()).district(spec.district()).city(spec.city())
                    .address(spec.address()).latitude(new BigDecimal(spec.latitude()))
                    .longitude(new BigDecimal(spec.longitude())).openingHours(OPENING_HOURS)
                    .licenceNo("NMRA/DEMO/%03d".formatted(i + 1)).status(PharmacyStatus.VERIFIED)
                    .demo(true).user(owner).build());
            pharmacies.add(pharmacy);
            stock.put(pharmacy, stockPharmacy(pharmacy, catalog, new Random(1000L + i)));
        }

        List<User> customers = new ArrayList<>();
        for (int i = 0; i < CUSTOMERS.size(); i++) {
            DemoCustomer spec = CUSTOMERS.get(i);
            customers.add(userRepository.save(User.builder()
                    .name(spec.name()).email(CUSTOMER_EMAIL.formatted(i + 1)).phone(spec.phone())
                    .password(password).role(Role.CUSTOMER).preferredLanguage(spec.language())
                    .district(spec.district()).demo(true).termsAcceptedAt(now).build()));
        }

        seedCustomerJourney(customers.get(0), pharmacies.get(0), pharmacies.get(1), stock, now);
        log.info("Demo data seeded: {} pharmacies, {} customers", pharmacies.size(), customers.size());
    }

    /** 15-30 lines from the catalog (staples first), priced within +/-15 % of the medicine's base price. */
    private List<Inventory> stockPharmacy(Pharmacy pharmacy, List<MedicineMaster> catalog, Random random) {
        List<MedicineMaster> staples = new ArrayList<>();
        List<MedicineMaster> others = new ArrayList<>();
        for (MedicineMaster medicine : catalog) {
            (STAPLE_BRANDS.contains(medicine.getBrandName()) ? staples : others).add(medicine);
        }
        Collections.shuffle(others, random);
        List<MedicineMaster> picked = new ArrayList<>(staples);
        picked.addAll(others);
        int lines = Math.min(picked.size(), MIN_STOCK_LINES + random.nextInt(MAX_STOCK_LINES - MIN_STOCK_LINES + 1));

        List<Inventory> saved = new ArrayList<>();
        for (MedicineMaster medicine : picked.subList(0, lines)) {
            BigDecimal base = new BigDecimal(BASE_PRICES.getOrDefault(medicine.getBrandName(), DEFAULT_BASE_PRICE.toPlainString()));
            BigDecimal price = base.multiply(BigDecimal.valueOf(0.85 + 0.30 * random.nextDouble()))
                    .setScale(2, RoundingMode.HALF_UP);
            saved.add(inventoryRepository.save(Inventory.builder()
                    .medicineMaster(medicine).pharmacy(pharmacy).unitPrice(price)
                    .expireDate(LocalDate.now().plusMonths(6 + random.nextInt(19)))
                    .stockQuantity(40 + random.nextInt(260)).available(true).build()));
        }
        return saved;
    }

    /**
     * Customer 1: a Colombo prescription request with the sample image, a quote from the first Colombo
     * pharmacy, a confirmed reservation from that quote, and a completed and a cancelled search reservation.
     */
    private void seedCustomerJourney(User customer, Pharmacy quoting, Pharmacy other,
                                     Map<Pharmacy, List<Inventory>> stock, LocalDateTime now) {
        LocalDateTime requestedAt = now.minusHours(3);
        PrescriptionRequest request = prescriptionRequestRepository.save(PrescriptionRequest.builder()
                .patient(customer).image(samplePrescriptionImage(customer)).patientAge(34)
                .note("Please let me know if you have all three medicines.")
                .status(PrescriptionRequestStatus.RESPONDED).targetScope(TargetScope.DISTRICT)
                .district(District.COLOMBO).consentAt(requestedAt).expiresAt(requestedAt.plusDays(requestExpiryDays))
                .targetPharmacies(new HashSet<>(List.of(quoting, other))).build());

        List<Inventory> quotingStock = stock.get(quoting);
        List<Inventory> quotedLines = new ArrayList<>();
        addMatching(quotedLines, quotingStock, "Amoxicillin");
        addMatching(quotedLines, quotingStock, "Paracetamol");
        for (Inventory line : quotingStock) {
            if (quotedLines.size() >= 2) {
                break;
            }
            if (!quotedLines.contains(line)) {
                quotedLines.add(line);
            }
        }

        PrescriptionResponse response = PrescriptionResponse.builder()
                .prescriptionRequest(request).pharmacy(quoting)
                .message("We have these in stock. Cetirizine is out of stock today.").build();
        for (Inventory line : quotedLines) {
            boolean antibiotic = line.getMedicineMaster().getGenericName().contains("Amoxicillin");
            response.getItems().add(PrescriptionResponseItem.builder()
                    .prescriptionResponse(response).inventoryItem(line).quantity(antibiotic ? 21 : 10)
                    .unitPrice(line.getUnitPrice()).build());
        }
        response = prescriptionResponseRepository.save(response);

        Reservation confirmed = reservation(customer, quoting, ReservationStatus.CONFIRMED, now.plusHours(holdHours));
        confirmed.setPrescriptionRequest(request);
        for (PrescriptionResponseItem quoted : response.getItems()) {
            confirmed.addItem(line(quoted.getInventoryItem(), quoted.getQuantity(), quoted.getUnitPrice(), quoted));
            hold(quoted.getInventoryItem(), quoted.getQuantity());
        }
        reservationRepository.save(confirmed);

        Inventory picked = stock.get(other).get(0);
        Reservation completed = reservation(customer, other, ReservationStatus.COMPLETED,
                now.minusDays(2).plusHours(holdHours));
        completed.addItem(line(picked, 2, picked.getUnitPrice(), null));
        hold(picked, 2);
        reservationRepository.save(completed);

        Inventory dropped = quotingStock.get(quotingStock.size() - 1);
        Reservation cancelled = reservation(customer, quoting, ReservationStatus.CANCELLED,
                now.minusDays(1).plusHours(holdHours));
        cancelled.setCancelledBy(CancelledBy.PATIENT);
        cancelled.setCancelReason("Found it at a pharmacy closer to home");
        cancelled.addItem(line(dropped, 1, dropped.getUnitPrice(), null));
        reservationRepository.save(cancelled);
    }

    private static void addMatching(List<Inventory> lines, List<Inventory> stock, String generic) {
        stock.stream()
                .filter(i -> i.getMedicineMaster().getGenericName().equalsIgnoreCase(generic))
                .findFirst()
                .ifPresent(lines::add);
    }

    private Reservation reservation(User customer, Pharmacy pharmacy, ReservationStatus status, LocalDateTime expiresAt) {
        String code;
        do {
            code = pickupCodeGenerator.next();
        } while (reservationRepository.existsByPickupCode(code));
        return Reservation.builder().patient(customer).pharmacy(pharmacy).status(status)
                .pickupCode(code).expiresAt(expiresAt).demo(pharmacy.isDemo()).build();
    }

    private static ReservationItem line(Inventory inventory, int quantity, BigDecimal unitPrice,
                                        PrescriptionResponseItem quoted) {
        MedicineMaster medicine = inventory.getMedicineMaster();
        return ReservationItem.builder()
                .inventoryItem(inventory).prescriptionResponseItem(quoted).quantity(quantity).unitPrice(unitPrice)
                .medicineName(medicine.getBrandName() + " " + medicine.getStrength())
                .requiresPrescription(medicine.getLegalCategory() != PrescriptionStatus.OTC)
                .build();
    }

    /** Confirmed and completed reservations took their stock, as a real reservation would. */
    private static void hold(Inventory inventory, int quantity) {
        inventory.setStockQuantity(inventory.getStockQuantity() - quantity);
    }

    /** Copies the bundled sample prescription into the upload directory, as an upload would store it. */
    private Image samplePrescriptionImage(User customer) {
        String filename = UUID.randomUUID() + ".webp";
        Path file = Path.of(uploadDir).resolve(filename);
        try (InputStream in = new ClassPathResource(SAMPLE_PRESCRIPTION).getInputStream()) {
            Files.createDirectories(file.getParent());
            Files.copy(in, file);
        } catch (IOException e) {
            throw new FileStorageException("Failed to copy the demo prescription image", e);
        }
        afterRollback(() -> deleteFile(file.toString()));

        Image image = imageRepository.save(Image.builder()
                .url("/api/images/pending").originalFilename("sample-prescription.webp")
                .generatedFilename(filename).filePath(uploadDir + "/" + filename).mimeType("image/webp")
                .imageType(ImageType.PRESCRIPTION).uploadedByUserId(customer.getId()).build());
        image.setUrl("/api/images/" + image.getId() + "/content");
        return image;
    }

    // ---------------------------------------------------------------- deleting

    private void removeDemoData() {
        List<User> demoUsers = userRepository.findByDemoTrue();
        Set<UUID> userIds = demoUsers.stream().map(User::getId).collect(Collectors.toSet());
        Set<Pharmacy> demoPharmacies = new LinkedHashSet<>(pharmacyRepository.findByDemoTrue());
        for (User user : demoUsers) {
            pharmacyRepository.findByUserId(user.getId()).ifPresent(demoPharmacies::add);
        }
        Set<UUID> pharmacyIds = demoPharmacies.stream().map(Pharmacy::getId).collect(Collectors.toSet());
        if (userIds.isEmpty() && pharmacyIds.isEmpty()) {
            return;
        }

        // Reservations of demo customers anywhere, and anyone's at demo pharmacies. A demo customer's
        // confirmed hold at a real pharmacy gives its stock back; demo stock is deleted anyway.
        List<Reservation> reservations = reservationRepository.findDistinctByPatientIdInOrPharmacyIdIn(userIds, pharmacyIds);
        for (Reservation reservation : reservations) {
            if (reservation.getStatus() == ReservationStatus.CONFIRMED
                    && !pharmacyIds.contains(reservation.getPharmacy().getId())) {
                for (ReservationItem item : reservation.getItems()) {
                    Inventory inventory = item.getInventoryItem();
                    inventory.setStockQuantity(inventory.getStockQuantity() + item.getQuantity());
                }
            }
        }
        reservationRepository.deleteAll(reservations);
        reservationRepository.flush();

        prescriptionResponseRepository.deleteAll(
                prescriptionResponseRepository.findByPharmacyIdInOrRequestPatientIdIn(pharmacyIds, userIds));
        prescriptionResponseRepository.flush();

        // Real requests that were sent to demo pharmacies keep their other targets.
        for (PrescriptionRequest request : prescriptionRequestRepository.findTargetingAnyPharmacy(pharmacyIds)) {
            request.getTargetPharmacies().removeIf(p -> pharmacyIds.contains(p.getId()));
        }
        List<PrescriptionRequest> requests = prescriptionRequestRepository.findByPatientIdIn(userIds);
        Map<UUID, Image> images = new LinkedHashMap<>();
        requests.forEach(r -> images.put(r.getImage().getId(), r.getImage()));
        prescriptionRequestRepository.deleteAll(requests);
        prescriptionRequestRepository.flush();

        List<Bookmark> bookmarks = bookmarkRepository.findByUserIdInOrInventoryPharmacyIdIn(userIds, pharmacyIds);
        bookmarkRepository.deleteAll(bookmarks);
        notificationRepository.deleteAll(notificationRepository.findByRecipientIdIn(userIds));

        for (MedicineMaster suggestion : medicineMasterRepository.findBySuggestedByPharmacyIdIn(pharmacyIds)) {
            if (suggestion.getStatus() == MedicineStatus.APPROVED) {
                suggestion.setSuggestedByPharmacy(null); // now part of the shared catalog
            } else {
                medicineMasterRepository.delete(suggestion);
            }
        }

        inventoryRepository.deleteAll(inventoryRepository.findByPharmacyIdIn(pharmacyIds));
        inventoryRepository.flush();

        imageRepository.findByUploadedByUserIdIn(userIds).forEach(i -> images.put(i.getId(), i));
        imageRepository.deleteAll(images.values());
        imageRepository.flush();
        List<String> files = images.values().stream().map(Image::getFilePath).toList();
        afterCommit(() -> files.forEach(this::deleteFile));

        pharmacyRepository.deleteAll(demoPharmacies);
        pharmacyRepository.flush();
        userRepository.deleteAll(demoUsers);
        userRepository.flush();
        log.info("Demo data deleted: {} pharmacies, {} users", demoPharmacies.size(), demoUsers.size());
    }

    /** Deletes a stored file, refusing anything outside the upload directory. */
    private void deleteFile(String path) {
        Path base = Path.of(uploadDir).toAbsolutePath().normalize();
        Path file = Path.of(path).toAbsolutePath().normalize();
        if (!file.startsWith(base)) {
            log.warn("Not deleting demo image outside the upload directory: {}", path);
            return;
        }
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.warn("Could not delete demo image {}: {}", path, e.getMessage());
        }
    }

    private static void afterCommit(Runnable action) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }

    private static void afterRollback(Runnable action) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    action.run();
                }
            }
        });
    }
}

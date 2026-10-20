package com.suwalink.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.suwalink.entity.Category;
import com.suwalink.entity.Currency;
import com.suwalink.entity.District;
import com.suwalink.entity.Inventory;
import com.suwalink.entity.Language;
import com.suwalink.entity.Manufacturer;
import com.suwalink.entity.MedicineMaster;
import com.suwalink.entity.Notification;
import com.suwalink.entity.NotificationType;
import com.suwalink.entity.Pharmacy;
import com.suwalink.entity.PharmacyStatus;
import com.suwalink.entity.PrescriptionStatus;
import com.suwalink.entity.Role;
import com.suwalink.entity.UnitOfMeasure;
import com.suwalink.entity.User;
import com.suwalink.event.NotificationKeys;
import com.suwalink.repository.CategoryRepository;
import com.suwalink.repository.InventoryRepository;
import com.suwalink.repository.ManufacturerRepository;
import com.suwalink.repository.MedicineMasterRepository;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.repository.PharmacyRepository;
import com.suwalink.repository.ReservationRepository;
import com.suwalink.repository.UserRepository;
import com.suwalink.security.JwtService;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Not {@code @Transactional}: the email is sent after the notification's transaction commits, so the
 * rows must really commit. The test profile runs {@code @Async} work synchronously
 * ({@code app.async.synchronous=true}) so assertions are deterministic. Seeded rows are removed in
 * {@link #cleanUp()}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationMailerTest {

    @MockitoBean private JavaMailSender mailSender;

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private NotificationService notificationService;
    @Autowired private NotificationMailer notificationMailer;
    @Autowired private UserRepository userRepository;
    @Autowired private PharmacyRepository pharmacyRepository;
    @Autowired private ManufacturerRepository manufacturerRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private MedicineMasterRepository medicineMasterRepository;
    @Autowired private InventoryRepository inventoryRepository;
    @Autowired private ReservationRepository reservationRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private TransactionTemplate transactionTemplate;

    private final String suffix = UUID.randomUUID().toString().substring(0, 8);
    private User customer;
    private User pharmacyUser;
    private Pharmacy pharmacy;
    private Manufacturer manufacturer;
    private Category category;
    private MedicineMaster medicine;
    private Inventory inventory;
    private String originalRedirect;

    @BeforeEach
    void seed() throws Exception {
        reset(mailSender);
        when(mailSender.createMimeMessage())
                .thenAnswer(invocation -> new MimeMessage(Session.getInstance(new Properties())));
        originalRedirect = (String) ReflectionTestUtils.getField(mailerTarget(), "demoRedirect");

        customer = userRepository.save(user("mail.customer." + suffix + "@example.com", Role.CUSTOMER));
        pharmacyUser = userRepository.save(user("mail.pharmacy." + suffix + "@example.com", Role.PHARMACY_OWNER));
        pharmacy = pharmacyRepository.save(Pharmacy.builder()
                .name("Mail Pharmacy").phone("0112345678").district(District.COLOMBO).city("Colombo")
                .latitude(new BigDecimal("6.927100")).longitude(new BigDecimal("79.861200"))
                .licenceNo("LIC-MAIL-" + suffix).address("1 Mail Road")
                .status(PharmacyStatus.VERIFIED).user(pharmacyUser).build());
        manufacturer = manufacturerRepository.save(Manufacturer.builder()
                .name("Mail-" + suffix).country("Sri Lanka").isActive(true).build());
        category = categoryRepository.save(Category.builder().name("Mail-" + suffix).active(true).build());
        medicine = medicineMasterRepository.save(MedicineMaster.builder()
                .brandName("Panadol").genericName("Paracetamol").dosageForm("Tablet").strength("500mg")
                .unitOfMeasure(UnitOfMeasure.TABLET).manufacturer(manufacturer)
                .therapeuticCategory(category).legalCategory(PrescriptionStatus.OTC).build());
        inventory = inventoryRepository.save(Inventory.builder()
                .medicineMaster(medicine).pharmacy(pharmacy).unitPrice(new BigDecimal("10.00"))
                .currency(Currency.LKR).stockQuantity(5).expireDate(LocalDate.now().plusYears(1))
                .available(true).build());
    }

    @AfterEach
    void cleanUp() throws Exception {
        ReflectionTestUtils.setField(mailerTarget(), "demoRedirect", originalRedirect);
        transactionTemplate.executeWithoutResult(status -> {
            reservationRepository.deleteByPharmacyId(pharmacy.getId());
            notificationRepository.deleteByRecipient_Id(customer.getId());
            notificationRepository.deleteByRecipient_Id(pharmacyUser.getId());
            inventoryRepository.deleteById(inventory.getId());
            medicineMasterRepository.deleteById(medicine.getId());
            categoryRepository.deleteById(category.getId());
            manufacturerRepository.deleteById(manufacturer.getId());
            pharmacyRepository.deleteById(pharmacy.getId());
            userRepository.deleteById(customer.getId());
            userRepository.deleteById(pharmacyUser.getId());
        });
    }

    @Test
    void emailSentAfterCommitInRecipientLanguage() throws Exception {
        customer.setPreferredLanguage(Language.SI);
        userRepository.save(customer);

        Notification saved = notificationService.notify(customer, NotificationType.SYSTEM_ALERT,
                NotificationKeys.PHARMACY_APPROVED, Map.of("pharmacy", "Mail Pharmacy"), "/pharmacy/dashboard");

        MimeMessage sent = onlySentMessage();
        assertThat(sent.getSubject()).isEqualTo(bundle("messages_si", "notify.pharmacy.approved.title"));
        assertThat(sent.getRecipients(Message.RecipientType.TO)[0].toString()).isEqualTo(customer.getEmail());
        assertThat(notificationRepository.findById(saved.getId()).orElseThrow().getEmailedAt()).isNotNull();
    }

    @Test
    void noEmailWhenTransactionRollsBack() {
        assertThatThrownBy(() -> transactionTemplate.executeWithoutResult(status -> {
            notificationService.notify(customer, NotificationType.SYSTEM_ALERT,
                    NotificationKeys.PHARMACY_APPROVED, Map.of("pharmacy", "Mail Pharmacy"), "/x");
            throw new IllegalStateException("boom");
        })).isInstanceOf(IllegalStateException.class);

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void mailFailureDoesNotBreakAction() throws Exception {
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(MimeMessage.class));

        mockMvc.perform(reservationRequest()).andExpect(status().isCreated());

        assertThat(reservationRepository.findAll().stream()
                .filter(r -> r.getPharmacy().getId().equals(pharmacy.getId()))).hasSize(1);
        var notifications = notificationRepository.findByRecipientOrderByCreatedAtDesc(customer);
        assertThat(notifications).hasSize(1);
        assertThat(notifications.get(0).getEmailedAt()).isNull();
    }

    @Test
    void demoRecipientRedirected() throws Exception {
        ReflectionTestUtils.setField(mailerTarget(), "demoRedirect", "demo@test.lk");
        customer.setDemo(true);
        userRepository.save(customer);

        notificationService.notify(customer, NotificationType.SYSTEM_ALERT,
                NotificationKeys.PHARMACY_APPROVED, Map.of("pharmacy", "Mail Pharmacy"), "/x");

        MimeMessage sent = onlySentMessage();
        assertThat(sent.getRecipients(Message.RecipientType.TO)).hasSize(1);
        assertThat(sent.getRecipients(Message.RecipientType.TO)[0].toString()).isEqualTo("demo@test.lk");
    }

    @Test
    void demoRecipientSkippedWithoutRedirect() throws Exception {
        ReflectionTestUtils.setField(mailerTarget(), "demoRedirect", "");
        customer.setDemo(true);
        userRepository.save(customer);

        Notification saved = notificationService.notify(customer, NotificationType.SYSTEM_ALERT,
                NotificationKeys.PHARMACY_APPROVED, Map.of("pharmacy", "Mail Pharmacy"), "/x");

        verify(mailSender, never()).send(any(MimeMessage.class));
        assertThat(notificationRepository.findById(saved.getId()).orElseThrow().getEmailedAt()).isNull();
    }

    @Test
    void emailContainsFrontendLink() throws Exception {
        mockMvc.perform(reservationRequest()).andExpect(status().isCreated());

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender, org.mockito.Mockito.atLeastOnce()).send(captor.capture());
        UUID reservationId = reservationRepository.findAll().stream()
                .filter(r -> r.getPharmacy().getId().equals(pharmacy.getId()))
                .findFirst().orElseThrow().getId();
        String customerMailBody = captor.getAllValues().stream()
                .filter(m -> toAddress(m).equals(customer.getEmail()))
                .map(this::content).findFirst().orElseThrow();
        assertThat(customerMailBody).contains("http://localhost:3000/reservations/" + reservationId);
    }

    @Test
    void paramsAreHtmlEscapedInBody() throws Exception {
        notificationService.notify(customer, NotificationType.SYSTEM_ALERT,
                NotificationKeys.PHARMACY_APPROVED, Map.of("pharmacy", "<b>x</b>"), "/x");

        String html = content(onlySentMessage());
        assertThat(html).contains("&lt;b&gt;x&lt;/b&gt;").doesNotContain("<b>x</b>");
    }

    private org.springframework.test.web.servlet.RequestBuilder reservationRequest() {
        String token = jwtService.generateToken(customer.getId(), customer.getEmail(), customer.getRole());
        return post("/api/reservations")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + token)
                .content("""
                    { "lines": [ { "inventoryItemId": "%s", "quantity": 1 } ] }
                    """.formatted(inventory.getId()));
    }

    private MimeMessage onlySentMessage() {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        return captor.getValue();
    }

    private String toAddress(MimeMessage message) {
        try {
            return message.getRecipients(Message.RecipientType.TO)[0].toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private String content(MimeMessage message) {
        try {
            return (String) message.getContent();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** The mailer is proxied (@Async); the demo-redirect field lives on the target. */
    private Object mailerTarget() {
        return AopUtils.isAopProxy(notificationMailer)
                ? AopTestUtils.getUltimateTargetObject(notificationMailer) : notificationMailer;
    }

    private String bundle(String name, String key) throws Exception {
        Properties properties = new Properties();
        try (var in = getClass().getResourceAsStream("/i18n/" + name + ".properties")) {
            properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return properties.getProperty(key);
    }

    private User user(String email, Role role) {
        return User.builder().termsAcceptedAt(java.time.LocalDateTime.now()).name("Mail User").email(email).phone("0770000000")
                .password("hash").role(role).build();
    }
}

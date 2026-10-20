package com.suwalink.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;

import com.suwalink.entity.NotificationType;
import com.suwalink.entity.Role;
import com.suwalink.entity.User;
import com.suwalink.event.NotificationKeys;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.repository.UserRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** Real thread pool of 1 thread and no queue: the second email is rejected but notify() must still succeed. */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {"app.async.synchronous=false", "app.async.mail.core-pool-size=1",
        "app.async.mail.max-pool-size=1", "app.async.mail.queue-capacity=0"})
class NotificationMailerSaturationTest {

    @MockitoBean private JavaMailSender mailSender;
    @Autowired private NotificationService notificationService;
    @Autowired private UserRepository userRepository;
    @Autowired private org.springframework.transaction.support.TransactionTemplate transactionTemplate;
    @Autowired private NotificationRepository notificationRepository;

    @Test
    void saturatedExecutorDoesNotBreakNotify() throws Exception {
        when(mailSender.createMimeMessage())
                .thenAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
        CountDownLatch sending = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(i -> {
            sending.countDown();
            release.await(10, TimeUnit.SECONDS);
            return null;
        }).when(mailSender).send(any(MimeMessage.class));

        User user = userRepository.save(User.builder().termsAcceptedAt(java.time.LocalDateTime.now()).name("Sat").phone("0770000000").password("hash")
                .email("sat." + UUID.randomUUID() + "@example.com").role(Role.CUSTOMER).build());
        try {
            notificationService.notify(user, NotificationType.SYSTEM_ALERT,
                    NotificationKeys.PHARMACY_APPROVED, Map.of("pharmacy", "A"), "/x");
            assertThat(sending.await(10, TimeUnit.SECONDS)).isTrue(); // the only worker is now busy

            notificationService.notify(user, NotificationType.SYSTEM_ALERT,
                    NotificationKeys.PHARMACY_APPROVED, Map.of("pharmacy", "B"), "/x"); // rejected, must not throw

            assertThat(notificationRepository.findByRecipientOrderByCreatedAtDesc(user)).hasSize(2);
        } finally {
            release.countDown();
            Thread.sleep(300); // let the in-flight send finish before its rows are removed
            transactionTemplate.executeWithoutResult(status -> {
                notificationRepository.deleteByRecipient_Id(user.getId());
                userRepository.deleteById(user.getId());
            });
        }
    }
}

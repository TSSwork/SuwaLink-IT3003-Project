package com.suwalink.service.impl;

import com.suwalink.config.AsyncConfig;
import com.suwalink.entity.Notification;
import com.suwalink.entity.User;
import com.suwalink.event.NotificationCreatedEvent;
import com.suwalink.repository.NotificationRepository;
import com.suwalink.service.NotificationMailer;
import com.suwalink.util.MessageRenderer;
import jakarta.mail.internet.MimeMessage;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.util.HtmlUtils;

/**
 * Listens after commit, so a rolled-back action never sends mail. {@code NotificationService.notify}
 * is itself transactional, so the event always has a transaction to wait for and no
 * {@code fallbackExecution} is needed. The work runs on the mail executor in its own
 * REQUIRES_NEW transaction (the publisher's transaction is already finished). Any failure is
 * logged with the notification id and exception class only - never the address - and swallowed.
 */
@Slf4j
@Service
public class NotificationMailerImpl implements NotificationMailer {

    private static final Pattern TEMPLATE_VAR = Pattern.compile("\\{\\{([a-zA-Z]+)}}");

    private final NotificationRepository notificationRepository;
    private final JavaMailSender mailSender;
    private final MessageRenderer messageRenderer;
    private final TransactionTemplate transaction;
    private final String template;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.mail.demo-redirect:}")
    private String demoRedirect;

    public NotificationMailerImpl(NotificationRepository notificationRepository, JavaMailSender mailSender,
                                  MessageRenderer messageRenderer, PlatformTransactionManager transactionManager) {
        this.notificationRepository = notificationRepository;
        this.mailSender = mailSender;
        this.messageRenderer = messageRenderer;
        this.transaction = new TransactionTemplate(transactionManager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.template = loadTemplate();
    }

    @Override
    @Async(AsyncConfig.MAIL_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotificationCreated(NotificationCreatedEvent event) {
        try {
            transaction.executeWithoutResult(status -> send(event.notificationId()));
        } catch (Exception e) {
            log.warn("Notification email failed: notificationId={} error={}",
                    event.notificationId(), e.getClass().getName());
        }
    }

    private void send(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId).orElse(null);
        if (notification == null || notification.getEmailedAt() != null) {
            return;
        }
        User recipient = notification.getRecipient();
        String to = recipient.isDemo() ? demoRedirect : recipient.getEmail();
        if (to == null || to.isBlank()) {
            return; // demo user with no redirect configured: never mail a real address
        }

        Locale locale = recipient.getPreferredLanguage().toLocale();
        String title = messageRenderer.render(notification.getMessageKey() + ".title", notification.getParams(), locale);
        String body = messageRenderer.render(notification.getMessageKey() + ".body", notification.getParams(), locale);
        String button = messageRenderer.render("email.notification.button", Map.of(), locale);
        String footer = messageRenderer.render("email.notification.footer", Map.of(), locale);

        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(title);
            helper.setText(html(Map.of(
                    "title", HtmlUtils.htmlEscape(title),
                    "body", HtmlUtils.htmlEscape(body),
                    "button", HtmlUtils.htmlEscape(button),
                    "footer", HtmlUtils.htmlEscape(footer),
                    "url", HtmlUtils.htmlEscape(buttonUrl(notification.getLink())))), true);
        } catch (jakarta.mail.MessagingException e) {
            throw new IllegalStateException(e);
        }
        mailSender.send(message);
        notification.setEmailedAt(LocalDateTime.now());
    }

    private String buttonUrl(String link) {
        String base = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1) : frontendBaseUrl;
        return link == null ? base : base + link;
    }

    /** Single-pass substitution of {{name}} so values containing {{...}} are never re-expanded. */
    private String html(Map<String, String> values) {
        Matcher matcher = TEMPLATE_VAR.matcher(template);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(out, Matcher.quoteReplacement(values.getOrDefault(matcher.group(1), "")));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private static String loadTemplate() {
        try (InputStream in = NotificationMailerImpl.class.getResourceAsStream("/templates/email/notification.html")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (java.io.IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}

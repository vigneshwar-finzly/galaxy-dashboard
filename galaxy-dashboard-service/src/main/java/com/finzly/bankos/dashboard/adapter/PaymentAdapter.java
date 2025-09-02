package com.finzly.bankos.dashboard.adapter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import com.swapstech.galaxy.persistence.config.TenantSchemaResolver;
import com.finzly.bankos.dashboard.dto.request.WidgetConfigRequest;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.HashMap;

@Component
public class PaymentAdapter {

    private static final Logger LOGGER = LoggerFactory.getLogger(PaymentAdapter.class);

    @Value("${service.payment.internal.url}")
    private String paymentURL;

    @Autowired
    TenantSchemaResolver resolver;

    @Autowired
    private WebClientAdapter webClientAdapter;

    public ResponseEntity<Void> test() {
        String url = paymentURL + "/payment-service/ping";

        LOGGER.info("Calling Payment Service at: {}", url);

        // Perform GET call using WebClient
        ResponseEntity<Void> block = webClientAdapter.getWebClient()
                .get()
                .uri(url)
                .retrieve()
                .toBodilessEntity()   // maps response body to empty (Void)
                .block();// block and return ResponseEntity<Void>

        System.out.print(block.getStatusCode());
        return block;

    }

    public ResponseEntity<Void> executeQuery() {
        String url = paymentURL + "/payment-service/ping";

        LOGGER.info("Calling Payment Service at: {}", url);
        ResponseEntity<Void> block = null;// block and return ResponseEntity<Void>

        try {
            // Perform GET call using WebClient
            block = webClientAdapter.getWebClient()
                    .get()
                    .uri(url)
                    .retrieve()
                    .toBodilessEntity()   // maps response body to empty (Void)
                    .block();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return block;

    }

    public Mono<Map<String, Object>> executeWidgetConfig(WidgetConfigRequest widgetConfigRequest) {
        LOGGER.info("In PaymentAdapter - executeWidgetConfig for widget: {}", widgetConfigRequest.getWidgetName());
        
        String url = paymentURL + "payment-service/api/widgets/generateAndExecuteQuery";
        LOGGER.info("Execute widget config URL: {}", url);
        
        return webClientAdapter.getWebClient()
            .post()
            .uri(url)
            .bodyValue(widgetConfigRequest)
            .retrieve()
            .bodyToMono(Object.class)
            .map(response -> {
                Map<String, Object> result = new HashMap<>();
                result.put("serviceName", getServiceName());
                result.put("data", response);
                return result;
            })
            .onErrorReturn(Map.of(
                "serviceName", getServiceName(),
                "error", "Failed to execute widget configuration on payment service",
                "widgetId", widgetConfigRequest.getWidgetId(),
                "widgetName", widgetConfigRequest.getWidgetName()
            ));
    }

    /**
     * Synchronous version of executeWidgetConfig for compatibility with existing code
     * @param widgetConfigRequest The widget configuration request
     * @return Response from payment service
     */
    public Map<String, Object> executeWidgetConfiguration(WidgetConfigRequest widgetConfigRequest) {
        LOGGER.info("Sending widget configuration to payment service: {}", widgetConfigRequest.getWidgetName());
        
        try {
            return executeWidgetConfig(widgetConfigRequest).block();
        } catch (Exception e) {
            LOGGER.error("Error calling payment service: {}", e.getMessage(), e);
            return Map.of(
                "serviceName", getServiceName(),
                "error", "Failed to execute widget configuration on payment service: " + e.getMessage(),
                "widgetId", widgetConfigRequest.getWidgetId(),
                "widgetName", widgetConfigRequest.getWidgetName()
            );
        }
    }

    /**
     * Validates if payment service is available
     * @return true if service is available, false otherwise
     */
    public boolean isPaymentServiceAvailable() {
        try {
            ResponseEntity<Void> response = test();
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            LOGGER.warn("Payment service health check failed: {}", e.getMessage());
            return false;
        }
    }

    public String getServiceName() {
        return "payment-service";
    }

    /**
     * Test method to validate widget configuration with payment service
     * @param widgetConfigRequest The widget configuration to test
     * @return Response message from payment service
     */
    public String testWidgetConfiguration(WidgetConfigRequest widgetConfigRequest) {
        LOGGER.info("Testing widget configuration with payment service: {}", widgetConfigRequest.getWidgetName());
        
        var response = executeWidgetConfiguration(widgetConfigRequest);
        
        if (response.containsKey("error")) {
            return "Payment service widget configuration failed. Error: " + response.get("error");
        } else {
            return "Payment service widget configuration executed successfully. Service: " + response.get("serviceName");
        }
    }
}

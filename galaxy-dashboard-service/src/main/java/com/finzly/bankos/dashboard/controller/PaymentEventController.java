package com.finzly.bankos.dashboard.controller;

import com.finzly.bankos.dashboard.dto.response.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller for handling payment-related trigger callbacks from the aggregator/POC.
 * Exposes an endpoint compatible with the POC: /api/payments/trigger-update
 */
@RestController
@RequestMapping("/payments")
@CrossOrigin
public class PaymentEventController {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventController.class);


    /**
     * Accepts trigger updates (compatibility endpoint for POC aggregator).
     * Currently acknowledges receipt.
     *
     * @param payload arbitrary payload containing widgetId and data
     * @return ApiResponse acknowledging the trigger
     */
    @PostMapping("/trigger-update")
    public ResponseEntity<ApiResponse<Void>> triggerUpdate(@RequestBody(required = false) Map<String, Object> payload) {
        String widgetId = payload != null && payload.get("widgetId") != null ? String.valueOf(payload.get("widgetId")) : "unknown";
        log.info("Received trigger-update for widget: {} with payload keys: {}", widgetId, payload != null ? payload.keySet() : "none");

        return ResponseEntity.ok(ApiResponse.success("Trigger received", null));
    }
}



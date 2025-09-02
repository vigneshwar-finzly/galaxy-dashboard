package com.finzly.bankos.dashboard.controller;

import com.finzly.bankos.dashboard.dto.request.WidgetDataRequest;
import com.finzly.bankos.dashboard.dto.response.WidgetDataResponse;
import com.finzly.bankos.dashboard.service.PaymentDashboardService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Payment Dashboard Controller implementing the DashboardControllerInterface.
 * Handles data requests for payment-related widgets.
 * API: /payment-service/getWidgetData
 */
@RestController
@RequestMapping("/payment-service")
@RequiredArgsConstructor
@CrossOrigin
public class PaymentDashboardController implements DashboardControllerInterface {

    private static final Logger log = LoggerFactory.getLogger(PaymentDashboardController.class);
    private final PaymentDashboardService paymentDashboardService;

    /**
     * Implementation of getWidgetData for payment data source
     */
    @Override
    @PostMapping("/getWidgetData")
    public WidgetDataResponse getWidgetData(@RequestBody WidgetDataRequest request) {
        log.info("PaymentDashboardController.getWidgetData called for widget: {}", request.getWidgetId());
        
        try {
            // Validate request
            if (!request.isValid()) {
                return WidgetDataResponse.error(request.getWidgetId(), request.getDataSource(), 
                    "Invalid request parameters");
            }

            // Validate that this is a payment data source
            if (!"Payment".equals(request.getDataSource()) && 
                !"finzly.payment".equals(request.getAppCode())) {
                return WidgetDataResponse.error(request.getWidgetId(), request.getDataSource(),
                    "This controller only handles payment data sources");
            }

            // Execute the data retrieval
            return paymentDashboardService.execute(request);
            
        } catch (Exception e) {
            log.error("Error processing widget data request for widget: {}", request.getWidgetId(), e);
            return WidgetDataResponse.error(request.getWidgetId(), request.getDataSource(),
                "Error processing widget data: " + e.getMessage());
        }
    }

    /**
     * Health check endpoint for payment dashboard service
     */
    @GetMapping("/health")
    public String health() {
        return "Payment Dashboard Service is running";
    }
}

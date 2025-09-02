package com.finzly.bankos.dashboard.controller;

import com.finzly.bankos.dashboard.dto.request.WidgetDataRequest;
import com.finzly.bankos.dashboard.dto.response.WidgetDataResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Interface that all dashboard data providers must implement.
 * This is a contract that every onboarded application should implement
 * to provide data for dashboard widgets.
 * 
 * Implementations include:
 * - PaymentDashboardController (for finzly.payment)
 * - LedgerDashboardController (for finzly.ledger) 
 * - CrmDashboardController (for finzly.crm)
 */
public interface DashboardControllerInterface {
    
    /**
     * Gets widget data based on the provided request parameters.
     * Each implementing service should process the request and return
     * data in the format appropriate for the requested chart type.
     * 
     * @param request Widget data request containing search, group, and measure parameters
     * @return WidgetDataResponse containing the requested data and metadata
     */
    @PostMapping("/getWidgetData")
    WidgetDataResponse getWidgetData(@RequestBody WidgetDataRequest request);
}

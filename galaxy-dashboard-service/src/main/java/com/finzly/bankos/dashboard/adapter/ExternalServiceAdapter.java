package com.finzly.bankos.dashboard.adapter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.ResourceAccessException;

import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExternalServiceAdapter {

    @Value("${external.service.url:http://localhost:8081}")
    private String externalServiceUrl;

    @Value("${external.service.endpoint:/api/query}")
    private String sqlEndpoint;

    private final RestTemplate restTemplate;

    /**
     * Sends SQL query to external service for execution
     * @param sqlQuery The SQL query to execute
     * @return Response from external service
     */
    public Map<String, Object> executeSqlQuery(String sqlQuery) {
        log.info("Sending SQL query to external service: {}", externalServiceUrl + sqlEndpoint);
        
        try {
            // Prepare simple request with just the SQL query
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sqlQuery", sqlQuery);

            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Create HTTP entity
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            // Make the call to external service
            ResponseEntity<Object> response = restTemplate.exchange(
                externalServiceUrl + sqlEndpoint,
                HttpMethod.POST,
                entity,
                Object.class
            );

            log.info("External service response received successfully");
            
            // Create response map similar to PaymentAdapter
            Map<String, Object> result = new HashMap<>();
            result.put("serviceName", getServiceName());
            result.put("data", response.getBody());
            return result;

        } catch (ResourceAccessException e) {
            log.error("Failed to connect to external service at {}: {}", externalServiceUrl, e.getMessage());
            return Map.of(
                "serviceName", getServiceName(),
                "error", "External service is not available: " + e.getMessage(),
                "sqlQuery", sqlQuery
            );
        } catch (Exception e) {
            log.error("Error calling external service: {}", e.getMessage(), e);
            return Map.of(
                "serviceName", getServiceName(),
                "error", "Failed to execute query on external service: " + e.getMessage(),
                "sqlQuery", sqlQuery
            );
        }
    }

    /**
     * Validates if external service is available
     * @return true if service is available, false otherwise
     */
    public boolean isExternalServiceAvailable() {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                externalServiceUrl + "/api/query/health",
                String.class
            );
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("External service health check failed: {}", e.getMessage());
            return false;
        }
    }

    public String getServiceName() {
        return "external-service";
    }
}
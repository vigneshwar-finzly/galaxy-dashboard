package com.finzly.bankos.dashboard.adapter;

import com.swapstech.galaxy.common.tenant.model.TenantContext;
import com.swapstech.galaxy.security.client.BankOSWebClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class WebClientAdapter {

    @Autowired
    private Environment env;


    @Autowired
    private BankOSWebClient bankOSWebClient;


    public WebClient getWebClient() {
        String tenantName = TenantContext.getCurrentTenant();
        return bankOSWebClient.webClient(getApiAuthUrl(tenantName),
                getApiAccountClientId(tenantName),
                getApiAccountSecret(tenantName));
    }

    public String getApiAccountClientId(String tenantName) {
        if (tenantName == null || tenantName.isBlank()) {
            tenantName = "banka"; // default value
        }
        return env.getProperty("bankos.paymenthub.tenant." + tenantName + ".apiaccount.clientId");
    }

    public String getApiAccountSecret(String tenantName) {
        if (tenantName == null || tenantName.isBlank()) {
            tenantName = "banka"; // default value
        }
        return env.getProperty("bankos.paymenthub.tenant." + tenantName + ".apiaccount.secret");
    }

    public String getApiAuthUrl(String tenantName) {
        if (tenantName == null || tenantName.isBlank()) {
            tenantName = "banka"; // default value
        }
        return env.getProperty("bankos.tenant." + tenantName + ".auth.url");
    }
}
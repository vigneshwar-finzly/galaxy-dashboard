package com.finzly.bankos.dashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.AutoConfigurationExcludeFilter;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.liquibase.LiquibaseAutoConfiguration;
import org.springframework.boot.context.TypeExcludeFilter;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.ComponentScan.Filter;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(exclude = {LiquibaseAutoConfiguration.class  /*, ContextStackAutoConfiguration.class*/ })
@ComponentScan(value={
		"com.finzly.bankos.dashboard",
		"com.swapstech.galaxy.dashboard",
		"com.swapstech.galaxy.jpa",
		"com.swapstech.galaxy.common",
		"com.swapstech.galaxy.security",
		"com.swapstech.galaxy.persistence.config",
		"com.finzly.bankos.sqs.messaging.publisher",
		"com.swapstech.galaxy.admin.config",
		"com.finzly.bankos.sqs.messaging.publisher",
		"com.finzly.bankos.sqs.messaging.config",
		"com.finzly.bankos.redis.cache.config",
		"com.swapstech.galaxy.i18n.service"
		},
	excludeFilters = {
	        @Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
	        @Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class) })
public class DashboardApplication {

    public static void main(String[] args) {
        SpringApplication.run(DashboardApplication.class, args);
    }
}

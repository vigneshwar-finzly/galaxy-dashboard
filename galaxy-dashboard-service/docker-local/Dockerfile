FROM openjdk:21-slim

#Set app home folder
ENV APP_HOME /app

#Create base app folder
RUN mkdir $APP_HOME

WORKDIR $APP_HOME

# Install required tools
RUN apt-get update && \
    apt-get install -y wget unzip default-mysql-client && \
    rm -rf /var/lib/apt/lists/*

# Install Liquibase
RUN wget -O /tmp/liquibase-4.4.3.zip https://github.com/liquibase/liquibase/releases/download/v4.4.3/liquibase-4.4.3.zip && \
    unzip /tmp/liquibase-4.4.3.zip -d /opt/liquibase && \
    chmod +x /opt/liquibase/liquibase && \
    ln -s /opt/liquibase/liquibase /usr/local/bin/liquibase && \
    rm /tmp/liquibase-4.4.3.zip

# Install MySQL JDBC driver
RUN wget https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.26.zip && \
    unzip mysql-connector-java-8.0.26.zip && \
    mv mysql-connector-java-8.0.26/mysql-connector-java-8.0.26.jar /opt/liquibase/lib/ && \
    rm -r mysql-connector-java-8.0.26*

# Copy your application JAR file
ARG JAR_FILE

ADD target/galaxy-dashboard-service-*.jar galaxy-dashboard-service.jar

# Copy Liquibase changelog and scripts
COPY ./docker-local/db/dashboard-db-changelog.xml /app/liquibase/dashboard-db-changelog.xml
COPY ./docker-local/db/scripts /app/liquibase/scripts

# Copy entrypoint script
COPY ./docker-local/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose the application port
EXPOSE 8089

ENTRYPOINT ["/entrypoint.sh"]
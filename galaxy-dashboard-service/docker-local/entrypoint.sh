#!/bin/bash
set -e

# Define database connection parameters
DB_URL=jdbc:mysql://host.docker.internal:3309/galaxy_dashboard_banka
DB_USERNAME=root
DB_PASSWORD=root

# Create the databases if they do not exist
mysql -h host.docker.internal -P 3309 -u root -proot <<EOF
CREATE DATABASE IF NOT EXISTS galaxy_dashboard_finzly;
CREATE DATABASE IF NOT EXISTS galaxy_dashboard_banka;
EOF

# Run Liquibase update command
liquibase --changeLogFile=/liquibase/dashboard-db-changelog.xml \
          --url=$DB_URL \
          --username=$DB_USERNAME \
          --password=$DB_PASSWORD \
          --classpath=/app/liquibase \
          --driver=com.mysql.cj.jdbc.Driver \
          update

# Start the application
exec java -jar galaxy-dashboard-service.jar --spring.config.name=application-local
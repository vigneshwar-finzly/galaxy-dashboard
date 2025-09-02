FROM openjdk:21

#Set app home folder
ENV APP_HOME /app

#Create base app folder
RUN mkdir $APP_HOME

WORKDIR $APP_HOME

ARG JAR_FILE

ADD target/${JAR_FILE} galaxy-dashboard-service.jar

EXPOSE 8080

ENTRYPOINT ["java","-jar","galaxy-dashboard-service.jar"]

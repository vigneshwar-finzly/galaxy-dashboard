package com.finzly.bankos.dashboard.repository;

import com.finzly.bankos.dashboard.entity.DashboardDatasourceConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DashboardDatasourceConfigRepository extends JpaRepository<DashboardDatasourceConfig, String> {

    List<DashboardDatasourceConfig> findAll();

    List<DashboardDatasourceConfig> findByAppCode(String appCode);

    Optional<DashboardDatasourceConfig> findByAppCodeAndName(String appCode, String name);

//    select d from DashboardDatasourceConfig d where d.name = :name
//    List<DashboardDatasourceConfig> findByName(String name);
      Optional<DashboardDatasourceConfig> findByName(String name);

    List<DashboardDatasourceConfig> findByNameIn(List<String> names);
}

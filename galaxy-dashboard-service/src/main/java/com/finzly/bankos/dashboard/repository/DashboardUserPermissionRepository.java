package com.finzly.bankos.dashboard.repository;

import com.finzly.bankos.dashboard.entity.DashboardUserPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DashboardUserPermissionRepository extends JpaRepository<DashboardUserPermission, Long> {

    List<DashboardUserPermission> findByDashboardId(Long dashboardId);

    List<DashboardUserPermission> findByUserId(String userId);

    List<DashboardUserPermission> findByDepartmentId(String departmentId);

    List<DashboardUserPermission> findByDashboardIdAndPermissionType(Long dashboardId, DashboardUserPermission.PermissionType permissionType);

    List<DashboardUserPermission> findByUserIdAndPermissionType(String userId, DashboardUserPermission.PermissionType permissionType);

    void deleteByDashboardId(Long dashboardId);

    void deleteByDashboardIdAndUserId(Long dashboardId, String userId);

    void deleteByDashboardIdAndDepartmentId(Long dashboardId, String departmentId);
}

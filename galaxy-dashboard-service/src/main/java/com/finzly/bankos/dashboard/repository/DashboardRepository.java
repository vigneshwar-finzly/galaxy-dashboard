package com.finzly.bankos.dashboard.repository;

import com.finzly.bankos.dashboard.entity.Dashboard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DashboardRepository extends JpaRepository<Dashboard, Long> {

    List<Dashboard> findByIsActiveTrue();

    List<Dashboard> findByCreatedByAndIsActiveTrue(String createdBy);

    Optional<Dashboard> findByIdAndIsActiveTrue(Long id);

    List<Dashboard> findByStatusAndIsActiveTrue(Dashboard.DashboardStatus status);

    @Query("SELECT d FROM Dashboard d WHERE d.isActive = true AND " +
           "(d.viewerType = 'GLOBAL' OR " +
           "(d.viewerType = 'PRIVATE' AND d.createdBy = :userId) OR " +
           "EXISTS (SELECT 1 FROM DashboardUserPermission p WHERE p.dashboard = d AND " +
           "(p.userId = :userId OR p.departmentId = :departmentId) AND p.permissionType = 'VIEWER'))")
    List<Dashboard> findVisibleDashboards(@Param("userId") String userId, @Param("departmentId") String departmentId);

    @Query("SELECT d FROM Dashboard d WHERE d.isActive = true AND " +
           "(d.editorType = 'GLOBAL' OR " +
           "(d.editorType = 'PRIVATE' AND d.createdBy = :userId) OR " +
           "EXISTS (SELECT 1 FROM DashboardUserPermission p WHERE p.dashboard = d AND " +
           "(p.userId = :userId OR p.departmentId = :departmentId) AND p.permissionType = 'EDITOR'))")
    List<Dashboard> findEditableDashboards(@Param("userId") String userId, @Param("departmentId") String departmentId);

    @Query("SELECT COUNT(d) > 0 FROM Dashboard d WHERE d.id = :dashboardId AND " +
           "(d.viewerType = 'GLOBAL' OR " +
           "(d.viewerType = 'PRIVATE' AND d.createdBy = :userId) OR " +
           "EXISTS (SELECT 1 FROM DashboardUserPermission p WHERE p.dashboard = d AND " +
           "(p.userId = :userId OR p.departmentId = :departmentId) AND p.permissionType = 'VIEWER'))")
    boolean hasViewPermission(@Param("dashboardId") Long dashboardId, @Param("userId") String userId, @Param("departmentId") String departmentId);

    @Query("SELECT COUNT(d) > 0 FROM Dashboard d WHERE d.id = :dashboardId AND " +
           "(d.editorType = 'GLOBAL' OR " +
           "(d.editorType = 'PRIVATE' AND d.createdBy = :userId) OR " +
           "EXISTS (SELECT 1 FROM DashboardUserPermission p WHERE p.dashboard = d AND " +
           "(p.userId = :userId OR p.departmentId = :departmentId) AND p.permissionType = 'EDITOR'))")
    boolean hasEditPermission(@Param("dashboardId") Long dashboardId, @Param("userId") String userId, @Param("departmentId") String departmentId);

    List<Dashboard> findByNameContainingIgnoreCaseAndIsActiveTrue(String name);
}

package com.finzly.bankos.dashboard.repository;

import com.finzly.bankos.dashboard.entity.Queue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QueueRepository extends JpaRepository<Queue, Long> {

    List<Queue> findByIsActiveTrue();

    List<Queue> findByAppCodeAndIsActiveTrue(String appCode);

    List<Queue> findByQueueTypeAndIsActiveTrue(Queue.QueueType queueType);

    Optional<Queue> findByQueueCodeAndIsActiveTrue(String queueCode);

    Optional<Queue> findByQueueNameAndIsActiveTrue(String queueName);

    List<Queue> findByQueueNameContainingIgnoreCaseAndIsActiveTrue(String queueName);

    List<Queue> findByIsActiveTrueOrderByPriorityDescQueueNameAsc();
}

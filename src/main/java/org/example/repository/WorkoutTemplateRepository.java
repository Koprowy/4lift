package org.example.repository;

import org.example.model.WorkoutTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WorkoutTemplateRepository extends JpaRepository<WorkoutTemplate, UUID> {
    List<WorkoutTemplate> findByUserIdOrderByCreatedAtDesc(UUID userId);
}

package org.example.repository;

import org.example.model.WorkoutExercise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WorkoutExerciseRepository
        extends JpaRepository<WorkoutExercise, UUID> {
}

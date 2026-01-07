package org.example.repository;

import org.example.model.Workout;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface WorkoutRepository extends JpaRepository<Workout, UUID> {

    List<Workout> findByUserIdOrderByWorkoutDateDesc(UUID userId);
    List<Workout> findByUserIdAndWorkoutDate(UUID userId, LocalDate workoutDate);

}

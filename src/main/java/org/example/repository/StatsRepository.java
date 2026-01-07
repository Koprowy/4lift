package org.example.repository;

import org.example.dto.ExerciseProgressPoint;
import org.example.model.Workout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StatsRepository extends JpaRepository<Workout, UUID> {

    @Query("""
        select new org.example.dto.ExerciseProgressPoint(
            w.workoutDate,
            max(s.weight)
        )
        from Workout w
        join w.exercises we
        join we.sets s
        where w.userId = :userId
          and lower(we.exerciseName) = lower(:name)
        group by w.workoutDate
        order by w.workoutDate
    """)
    List<ExerciseProgressPoint> exerciseProgress(@Param("userId") UUID userId,
                                                 @Param("name") String name);
}

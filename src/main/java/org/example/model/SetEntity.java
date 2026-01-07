package org.example.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "sets")
@Getter
@Setter
public class SetEntity {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "workout_exercise_id", nullable = false)
    @JsonBackReference
    private WorkoutExercise workoutExercise;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal weight;

    @Column(nullable = false)
    private int reps;

    @Column(name = "set_order")
    private int setOrder;

    @Column(name = "is_drop")
    private boolean drop;

    private UUID parentSetId;
}



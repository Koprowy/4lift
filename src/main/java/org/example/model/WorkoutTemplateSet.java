package org.example.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "workout_template_set")
@Getter @Setter
public class WorkoutTemplateSet {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "template_exercise_id")
    @JsonBackReference
    private WorkoutTemplateExercise templateExercise;

    @Column(name = "set_order", nullable = false)
    private int setOrder;

    @Column(nullable = false)
    private int reps;

    @Column(name = "is_drop", nullable = false)
    private boolean isDrop;
}

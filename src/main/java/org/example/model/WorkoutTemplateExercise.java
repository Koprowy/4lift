package org.example.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workout_template_exercise")
@Getter @Setter
public class WorkoutTemplateExercise {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "template_id")
    @JsonBackReference
    private WorkoutTemplate template;

    @Column(name = "exercise_order", nullable = false)
    private int exerciseOrder;

    @Column(name = "exercise_name", nullable = false)
    private String exerciseName;

    @OneToMany(mappedBy = "templateExercise", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<WorkoutTemplateSet> sets;
}

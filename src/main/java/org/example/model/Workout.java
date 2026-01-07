package org.example.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
@Entity
@Getter
@Setter
public class Workout {

    @Id
    @GeneratedValue
    private UUID id;

    private UUID userId;
    private LocalDate workoutDate;
    private String templateName;

    @Column(length = 500)
    private String notes;

    @OneToMany(
            mappedBy = "workout",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @JsonManagedReference
    private List<WorkoutExercise> exercises;
}


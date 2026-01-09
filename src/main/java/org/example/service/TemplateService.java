package org.example.service;

import lombok.RequiredArgsConstructor;
import org.example.dto.TemplateRequest;
import org.example.model.*;
import org.example.repository.WorkoutTemplateRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final WorkoutTemplateRepository repo;

    public void save(TemplateRequest req) {
        WorkoutTemplate t = new WorkoutTemplate();
        t.setUserId(req.userId());
        t.setName(req.name());
        t.setCreatedAt(OffsetDateTime.now());

        List<WorkoutTemplateExercise> exs = req.exercises().stream().map(ex -> {
            WorkoutTemplateExercise e = new WorkoutTemplateExercise();
            e.setTemplate(t);
            e.setExerciseName(ex.name());
            e.setExerciseOrder(ex.order());

            List<WorkoutTemplateSet> sets = ex.sets().stream().map(s -> {
                WorkoutTemplateSet st = new WorkoutTemplateSet();
                st.setTemplateExercise(e);
                st.setSetOrder(s.order());
                st.setReps(s.reps());
                st.setIsDrop(s.isDrop());
                return st;
            }).toList();

            e.setSets(sets);
            return e;
        }).toList();

        t.setExercises(exs);
        repo.save(t);
    }

    public List<WorkoutTemplate> list(UUID userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void delete(UUID userId, UUID templateId) {
        // prosta autoryzacja: kasujesz tylko swoje
        WorkoutTemplate t = repo.findById(templateId).orElseThrow();
        if (!t.getUserId().equals(userId)) throw new RuntimeException("Not allowed");
        repo.deleteById(templateId);
    }
}

package org.example.controller;

import lombok.RequiredArgsConstructor;
import org.example.dto.TemplateRequest;
import org.example.model.WorkoutTemplate;
import org.example.service.TemplateService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TemplateController {

    private final TemplateService service;

    @PostMapping
    public void create(@RequestBody TemplateRequest req) {
        service.save(req);
    }

    @GetMapping
    public List<WorkoutTemplate> list(@RequestParam UUID userId) {
        return service.list(userId);
    }

    @DeleteMapping("/{id}")
    public void delete(@RequestParam UUID userId, @PathVariable UUID id) {
        service.delete(userId, id);
    }
}

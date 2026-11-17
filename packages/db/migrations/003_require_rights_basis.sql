ALTER TABLE sources ADD CONSTRAINT approved_sources_require_rights_basis
  CHECK (rights_status <> 'approved' OR (rights_basis IS NOT NULL AND char_length(rights_basis) >= 20));

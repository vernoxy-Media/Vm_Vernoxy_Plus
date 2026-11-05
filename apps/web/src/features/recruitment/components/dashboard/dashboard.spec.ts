import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeStage,
  isOpenStage,
  normalizeSource,
  filterCandidates,
  calculatePercentage,
  INITIAL_FILTER_STATE,
  DashboardFilterState,
} from './dashboard.utils';
import { CandidateItem } from '../../hooks/use-recruitment';

const mockCandidates: CandidateItem[] = [
  {
    candidate_id: 1,
    candidate_code: 'CAN-0001',
    name: 'Rahul Sharma',
    phone: '9876543210',
    email: 'rahul.sharma@example.com',
    role_id: 101,
    role_name: 'Software Engineer',
    dep_id: 201,
    department_name: 'Engineering',
    experience_type: 'experienced',
    exp_years: 3,
    exp_months: 6,
    key_skills: ['React', 'Node.js'],
    source: 'job_portal',
    stage: 'new',
    created_at: '2026-10-15T10:00:00.000Z',
  },
  {
    candidate_id: 2,
    candidate_code: 'CAN-0002',
    name: 'Priya Patel',
    phone: '9876543211',
    email: 'priya.patel@example.com',
    role_id: 102,
    role_name: 'QA Engineer',
    dep_id: 202,
    department_name: 'Quality Assurance',
    experience_type: 'fresher',
    exp_years: 0,
    exp_months: 0,
    key_skills: ['Selenium', 'Java'],
    source: 'LinkedIn',
    stage: 'screening',
    created_at: '2026-10-20T10:00:00.000Z',
  },
  {
    candidate_id: 3,
    candidate_code: 'CAN-0003',
    name: 'Amit Verma',
    phone: '9876543212',
    email: 'amit.verma@example.com',
    role_id: 101,
    role_name: 'Software Engineer',
    dep_id: 201,
    department_name: 'Engineering',
    experience_type: 'experienced',
    exp_years: 5,
    exp_months: 0,
    key_skills: ['Python', 'Django'],
    source: 'employee_referral',
    stage: 'interviewing',
    created_at: '2026-10-25T10:00:00.000Z',
  },
  {
    candidate_id: 4,
    candidate_code: 'CAN-0004',
    name: 'Sneha Rao',
    phone: '9876543213',
    email: 'sneha.rao@example.com',
    role_id: 103,
    role_name: 'Product Manager',
    dep_id: 203,
    department_name: 'Product',
    experience_type: 'experienced',
    exp_years: 4,
    exp_months: 2,
    key_skills: ['Agile', 'Jira'],
    source: 'Company Website',
    stage: 'on_hold',
    created_at: '2026-11-01T10:00:00.000Z',
  },
  {
    candidate_id: 5,
    candidate_code: 'CAN-0005',
    name: 'Ankit Gupta',
    phone: '9876543214',
    email: 'ankit.gupta@example.com',
    role_id: 104,
    role_name: 'UI/UX Designer',
    dep_id: 204,
    department_name: 'Design',
    experience_type: 'fresher',
    exp_years: 0,
    exp_months: 0,
    key_skills: ['Figma'],
    source: 'Campus',
    stage: 'selected',
    created_at: '2026-11-02T10:00:00.000Z',
  },
  {
    candidate_id: 6,
    candidate_code: 'CAN-0006',
    name: 'Kavita Singh',
    phone: '9876543215',
    email: 'kavita.singh@example.com',
    role_id: 101,
    role_name: 'Software Engineer',
    dep_id: 201,
    department_name: 'Engineering',
    experience_type: 'experienced',
    exp_years: 2,
    exp_months: 0,
    key_skills: ['React'],
    source: 'Walk-in',
    stage: 'onboarding',
    created_at: '2026-11-03T10:00:00.000Z',
  },
  {
    candidate_id: 7,
    candidate_code: 'CAN-0007',
    name: 'Vikram Joshi',
    phone: '9876543216',
    email: 'vikram.joshi@example.com',
    role_id: 101,
    role_name: 'Software Engineer',
    dep_id: 201,
    department_name: 'Engineering',
    experience_type: 'experienced',
    exp_years: 6,
    exp_months: 0,
    key_skills: ['DevOps'],
    source: 'Consultancy',
    stage: 'rejected',
    created_at: '2026-10-10T10:00:00.000Z',
  },
  {
    candidate_id: 8,
    candidate_code: 'CAN-0008',
    name: 'Deepak Mehta',
    phone: '9876543217',
    email: 'deepak.mehta@example.com',
    role_id: 102,
    role_name: 'QA Engineer',
    dep_id: 202,
    department_name: 'Quality Assurance',
    experience_type: 'fresher',
    exp_years: 0,
    exp_months: 0,
    key_skills: ['Manual Testing'],
    source: 'Social Media',
    stage: 'joined',
    created_at: '2026-10-12T10:00:00.000Z',
  },
  {
    candidate_id: 9,
    candidate_code: 'CAN-0009',
    name: 'Neha Nair',
    phone: '9876543218',
    email: 'neha.nair@example.com',
    role_id: 105,
    role_name: 'HR Executive',
    dep_id: 205,
    department_name: 'Human Resources',
    experience_type: 'fresher',
    exp_years: 0,
    exp_months: 0,
    key_skills: ['HR Operations'],
    source: 'Other',
    stage: 'did_not_join',
    created_at: '2026-10-14T10:00:00.000Z',
  },
];

describe('Recruitment Dashboard Logic - US01: Candidate Pipeline by Stage', () => {
  test('correctly normalizes stages and identifies open vs closed stages', () => {
    assert.equal(normalizeStage('new'), 'New');
    assert.equal(normalizeStage('open'), 'New');
    assert.equal(normalizeStage('screening'), 'Screening');
    assert.equal(normalizeStage('interviewing'), 'Interviewing');
    assert.equal(normalizeStage('on_hold'), 'On Hold');
    assert.equal(normalizeStage('selected'), 'Selected');
    assert.equal(normalizeStage('onboarding'), 'Onboarding');
    assert.equal(normalizeStage('rejected'), 'Rejected');
    assert.equal(normalizeStage('joined'), 'Joined');
    assert.equal(normalizeStage('did_not_join'), 'Did not join');

    assert.equal(isOpenStage('New'), true);
    assert.equal(isOpenStage('Screening'), true);
    assert.equal(isOpenStage('Interviewing'), true);
    assert.equal(isOpenStage('On Hold'), true);
    assert.equal(isOpenStage('Selected'), true);
    assert.equal(isOpenStage('Onboarding'), true);
    assert.equal(isOpenStage('Rejected'), false);
    assert.equal(isOpenStage('Joined'), false);
    assert.equal(isOpenStage('Did not join'), false);
  });

  test('default filter Stage=Open includes 6 open stages and excludes closed stages', () => {
    const filtered = filterCandidates(mockCandidates, INITIAL_FILTER_STATE);
    // Candidates 1 to 6 are open, 7 (rejected), 8 (joined), 9 (did_not_join) are closed
    assert.equal(filtered.length, 6);
    assert.deepEqual(
      filtered.map((c) => c.candidate_id),
      [1, 2, 3, 4, 5, 6]
    );
  });

  test('Stage=All includes all 9 stages including closed stages', () => {
    const allFilters: DashboardFilterState = {
      ...INITIAL_FILTER_STATE,
      stage: 'All',
    };
    const filtered = filterCandidates(mockCandidates, allFilters);
    assert.equal(filtered.length, 9);
  });

  test('specific Stage filter selects only candidates in that stage', () => {
    const filterSelected: DashboardFilterState = {
      ...INITIAL_FILTER_STATE,
      stage: 'selected',
    };
    const filtered = filterCandidates(mockCandidates, filterSelected);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'Ankit Gupta');
  });
});

describe('Recruitment Dashboard Logic - US02: Candidate Sources', () => {
  test('correctly maps raw source strings to 9 standard sources', () => {
    assert.equal(normalizeSource('job_portal'), 'Job Portal');
    assert.equal(normalizeSource('naukri'), 'Job Portal');
    assert.equal(normalizeSource('LinkedIn'), 'LinkedIn');
    assert.equal(normalizeSource('Company Website'), 'Company Website');
    assert.equal(normalizeSource('employee_referral'), 'Employee Referral');
    assert.equal(normalizeSource('consultancy'), 'Consultancy');
    assert.equal(normalizeSource('campus'), 'Campus');
    assert.equal(normalizeSource('walk_in'), 'Walk-in');
    assert.equal(normalizeSource('social_media'), 'Social Media');
    assert.equal(normalizeSource('unknown'), 'Other');
  });

  test('filters candidates by source', () => {
    const filterSource: DashboardFilterState = {
      ...INITIAL_FILTER_STATE,
      stage: 'All',
      source: 'LinkedIn',
    };
    const filtered = filterCandidates(mockCandidates, filterSource);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].candidate_code, 'CAN-0002');
  });
});

describe('Recruitment Dashboard Logic - US03: Candidates by Position', () => {
  test('filters candidates by position (role_id)', () => {
    const filterPos: DashboardFilterState = {
      ...INITIAL_FILTER_STATE,
      stage: 'All',
      position: '101', // Software Engineer
    };
    const filtered = filterCandidates(mockCandidates, filterPos);
    // Candidates 1, 3, 6, 7 have role_id: 101
    assert.equal(filtered.length, 4);
    assert.ok(filtered.every((c) => c.role_name === 'Software Engineer'));
  });
});

describe('Recruitment Dashboard Logic - US04: Candidates by Experience Type', () => {
  test('filters candidates by experience type', () => {
    const filterFresher: DashboardFilterState = {
      ...INITIAL_FILTER_STATE,
      stage: 'All',
      experienceType: 'Fresher',
    };
    const filtered = filterCandidates(mockCandidates, filterFresher);
    // Candidates 2, 5, 8, 9 are freshers
    assert.equal(filtered.length, 4);
    assert.ok(filtered.every((c) => c.experience_type === 'fresher'));

    const filterExp: DashboardFilterState = {
      ...INITIAL_FILTER_STATE,
      stage: 'All',
      experienceType: 'Experienced',
    };
    const filteredExp = filterCandidates(mockCandidates, filterExp);
    assert.equal(filteredExp.length, 5);
  });
});

describe('Recruitment Dashboard Logic - US05: Global Search & Combined Filters', () => {
  test('search works across candidate ID, name, email, phone, position, dept, source', () => {
    // Search by Name
    let res = filterCandidates(mockCandidates, { ...INITIAL_FILTER_STATE, stage: 'All', searchQuery: 'Rahul' });
    assert.equal(res.length, 1);
    assert.equal(res[0].name, 'Rahul Sharma');

    // Search by Candidate Code
    res = filterCandidates(mockCandidates, { ...INITIAL_FILTER_STATE, stage: 'All', searchQuery: 'CAN-0003' });
    assert.equal(res.length, 1);
    assert.equal(res[0].name, 'Amit Verma');

    // Search by Phone
    res = filterCandidates(mockCandidates, { ...INITIAL_FILTER_STATE, stage: 'All', searchQuery: '9876543214' });
    assert.equal(res.length, 1);
    assert.equal(res[0].name, 'Ankit Gupta');

    // Search by Position
    res = filterCandidates(mockCandidates, { ...INITIAL_FILTER_STATE, stage: 'All', searchQuery: 'Product Manager' });
    assert.equal(res.length, 1);
    assert.equal(res[0].name, 'Sneha Rao');

    // Search by Department
    res = filterCandidates(mockCandidates, { ...INITIAL_FILTER_STATE, stage: 'All', searchQuery: 'Quality Assurance' });
    assert.equal(res.length, 2);

    // Search is case-insensitive
    res = filterCandidates(mockCandidates, { ...INITIAL_FILTER_STATE, stage: 'All', searchQuery: 'pAtEl' });
    assert.equal(res.length, 1);
  });

  test('combined filters work with AND logic', () => {
    // Position = Software Engineer AND Source = Employee Referral AND Stage = Open
    const combined: DashboardFilterState = {
      ...INITIAL_FILTER_STATE,
      stage: 'Open',
      position: '101',
      source: 'Employee Referral',
    };
    const filtered = filterCandidates(mockCandidates, combined);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'Amit Verma');
  });

  test('date range filter correctly filters by created_at inclusively', () => {
    const dateFiltered: DashboardFilterState = {
      ...INITIAL_FILTER_STATE,
      stage: 'All',
      dateRange: {
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        preset: 'custom',
      },
    };
    const filtered = filterCandidates(mockCandidates, dateFiltered);
    // Candidates 4 (Nov 1), 5 (Nov 2), 6 (Nov 3)
    assert.equal(filtered.length, 3);
  });

  test('calculates percentages safely without NaN or division by zero', () => {
    assert.equal(calculatePercentage(0, 0), 0);
    assert.equal(calculatePercentage(5, 0), 0);
    assert.equal(calculatePercentage(1, 4), 25);
    assert.equal(calculatePercentage(1, 3), 33.3);
  });
});
